/**
 * Supabase-backed data access layer.
 * Replaces the old JSON file storage with persistent Supabase tables.
 */

import { getSupabase } from "./supabase";

// --- Types ---

export interface User {
  id: string;
  auth_id: string;
  email: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Monitor {
  id: string;
  user_id: string;
  name: string;
  url: string;
  schedule: string;
  webhook_url: string | null;
  baseline: Record<string, unknown> | null;
  last_checked_at: string | null;
  created_at: string;
}

export interface ChangeRecord {
  id: string;
  monitor_id: string;
  changes: Record<string, unknown>[];
  spec_snapshot: Record<string, unknown> | null;
  checked_at: string;
}

// --- Data Access ---

export const db = {
  users: {
    getAll: async () => {
      const { data } = await getSupabase().from("acg_users").select("*");
      return (data || []) as User[];
    },
    getById: async (id: string) => {
      const { data } = await getSupabase()
        .from("acg_users")
        .select("*")
        .eq("id", id)
        .single();
      return data as User | null;
    },
    getByAuthId: async (authId: string) => {
      const { data } = await getSupabase()
        .from("acg_users")
        .select("*")
        .eq("auth_id", authId)
        .single();
      return data as User | null;
    },
    getByStripeCustomerId: async (customerId: string) => {
      const { data } = await getSupabase()
        .from("acg_users")
        .select("*")
        .eq("stripe_customer_id", customerId)
        .single();
      return data as User | null;
    },
    update: async (id: string, fields: Partial<User>) => {
      await getSupabase()
        .from("acg_users")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id);
    },
  },
  monitors: {
    getByUserId: async (userId: string) => {
      const { data } = await getSupabase()
        .from("acg_monitors")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      return (data || []) as Monitor[];
    },
    getById: async (id: string) => {
      const { data } = await getSupabase()
        .from("acg_monitors")
        .select("*")
        .eq("id", id)
        .single();
      return data as Monitor | null;
    },
    countByUserId: async (userId: string) => {
      const { count } = await getSupabase()
        .from("acg_monitors")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      return count || 0;
    },
    insert: async (monitor: Omit<Monitor, "id" | "created_at">) => {
      const { data, error } = await getSupabase()
        .from("acg_monitors")
        .insert(monitor)
        .select()
        .single();
      if (error) throw error;
      return data as Monitor;
    },
    update: async (id: string, fields: Partial<Monitor>) => {
      await getSupabase().from("acg_monitors").update(fields).eq("id", id);
    },
    delete: async (id: string) => {
      await getSupabase().from("acg_monitors").delete().eq("id", id);
    },
    getDueForCheck: async (tier: string, intervalSeconds: number) => {
      const cutoff = new Date(
        Date.now() - intervalSeconds * 1000
      ).toISOString();
      const { data } = await getSupabase()
        .from("acg_monitors")
        .select("*, acg_users!inner(plan)")
        .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
        .eq("acg_users.plan", tier);
      return (data || []) as (Monitor & {
        acg_users: { plan: string };
      })[];
    },
  },
  changes: {
    getByMonitorId: async (monitorId: string) => {
      const { data } = await getSupabase()
        .from("acg_changes")
        .select("*")
        .eq("monitor_id", monitorId)
        .order("checked_at", { ascending: false })
        .limit(50);
      return (data || []) as ChangeRecord[];
    },
    insert: async (record: Omit<ChangeRecord, "id" | "checked_at">) => {
      const { data, error } = await getSupabase()
        .from("acg_changes")
        .insert(record)
        .select()
        .single();
      if (error) throw error;
      return data as ChangeRecord;
    },
    deleteByMonitorId: async (monitorId: string) => {
      await getSupabase()
        .from("acg_changes")
        .delete()
        .eq("monitor_id", monitorId);
    },
  },
};
