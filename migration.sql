-- ACG Migration: Create tables for persistent storage
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Users table (synced from Supabase Auth + Stripe webhooks)
CREATE TABLE IF NOT EXISTS acg_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','starter','pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Monitors table
CREATE TABLE IF NOT EXISTS acg_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES acg_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  schedule TEXT NOT NULL DEFAULT 'daily',
  webhook_url TEXT,
  baseline JSONB,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Changes table
CREATE TABLE IF NOT EXISTS acg_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES acg_monitors(id) ON DELETE CASCADE,
  changes JSONB NOT NULL DEFAULT '[]',
  spec_snapshot JSONB,
  checked_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_acg_monitors_user_id ON acg_monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_acg_monitors_last_checked ON acg_monitors(last_checked_at);
CREATE INDEX IF NOT EXISTS idx_acg_changes_monitor_id ON acg_changes(monitor_id);
CREATE INDEX IF NOT EXISTS idx_acg_changes_checked_at ON acg_changes(checked_at);
CREATE INDEX IF NOT EXISTS idx_acg_users_auth_id ON acg_users(auth_id);

-- RLS policies (service_role bypasses these; anon/authenticated use them)
ALTER TABLE acg_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE acg_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE acg_changes ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (our API routes use service_role key)
CREATE POLICY "service_role_all_users" ON acg_users FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_monitors" ON acg_monitors FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_changes" ON acg_changes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users can only see their own data
CREATE POLICY "users_own_row" ON acg_users FOR ALL TO authenticated
  USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());
CREATE POLICY "monitors_own" ON acg_monitors FOR ALL TO authenticated
  USING (user_id IN (SELECT id FROM acg_users WHERE auth_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM acg_users WHERE auth_id = auth.uid()));
CREATE POLICY "changes_own" ON acg_changes FOR ALL TO authenticated
  USING (monitor_id IN (SELECT id FROM acg_monitors WHERE user_id IN (SELECT id FROM acg_users WHERE auth_id = auth.uid())))
  WITH CHECK (monitor_id IN (SELECT id FROM acg_monitors WHERE user_id IN (SELECT id FROM acg_users WHERE auth_id = auth.uid())));
