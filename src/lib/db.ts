import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import path from "path";

// --- Schema ---

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  githubId: text("github_id"),
  githubToken: text("github_token"),
  plan: text("plan").default("free"), // free | starter | pro
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});

export const monitors = sqliteTable("monitors", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  specUrl: text("spec_url").notNull(), // OpenAPI spec URL or GitHub raw URL
  specType: text("spec_type").default("url"), // url | github
  lastSpec: text("last_spec"), // JSON of last fetched spec
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  checkInterval: integer("check_interval").default(3600), // seconds
  webhookUrl: text("webhook_url"),
  alertEmail: text("alert_email"),
  status: text("status").default("active"), // active | paused | error
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
});

export const changes = sqliteTable("changes", {
  id: text("id").primaryKey(),
  monitorId: text("monitor_id")
    .notNull()
    .references(() => monitors.id),
  severity: text("severity").notNull(), // breaking | warning | info
  changeType: text("change_type").notNull(), // endpoint_removed | type_changed | field_required | param_renamed | endpoint_added | field_added
  path: text("path").notNull(), // e.g. /users/{id} GET
  description: text("description").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  detectedAt: integer("detected_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`
  ),
  acknowledged: integer("acknowledged", { mode: "boolean" }).default(false),
});

// --- Database Connection ---

const DB_PATH =
  process.env.DB_PATH ||
  path.join(process.cwd(), "data", "api-guardian.sqlite");

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    // Ensure data directory exists
    const dir = path.dirname(DB_PATH);
    const fs = require("fs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");

    // Create tables
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        name TEXT,
        github_id TEXT,
        github_token TEXT,
        plan TEXT DEFAULT 'free',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS monitors (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        name TEXT NOT NULL,
        spec_url TEXT NOT NULL,
        spec_type TEXT DEFAULT 'url',
        last_spec TEXT,
        last_checked_at INTEGER,
        check_interval INTEGER DEFAULT 3600,
        webhook_url TEXT,
        alert_email TEXT,
        status TEXT DEFAULT 'active',
        created_at INTEGER DEFAULT (unixepoch())
      );
      CREATE TABLE IF NOT EXISTS changes (
        id TEXT PRIMARY KEY,
        monitor_id TEXT NOT NULL REFERENCES monitors(id),
        severity TEXT NOT NULL,
        change_type TEXT NOT NULL,
        path TEXT NOT NULL,
        description TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        detected_at INTEGER DEFAULT (unixepoch()),
        acknowledged INTEGER DEFAULT 0
      );
    `);

    _db = drizzle(sqlite);
  }
  return _db;
}
