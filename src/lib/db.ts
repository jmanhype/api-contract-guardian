/**
 * Simple JSON file-based storage for Vercel deployment.
 * SQLite native modules don't work on Vercel serverless.
 * This uses /tmp for ephemeral storage on Vercel, or ./data locally.
 */

import fs from "fs";
import path from "path";

const DATA_DIR = process.env.VERCEL
  ? "/tmp/acg-data"
  : path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, fallback: T[]): T[] {
  ensureDir();
  const fp = path.join(DATA_DIR, file);
  if (!fs.existsSync(fp)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(fp, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson<T>(file: string, data: T[]): void {
  ensureDir();
  const fp = path.join(DATA_DIR, file);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2));
}

// --- Types ---

export interface User {
  id: string;
  email: string;
  name: string | null;
  githubId: string | null;
  githubToken: string | null;
  plan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: number;
}

export interface Monitor {
  id: string;
  userId: string;
  name: string;
  specUrl: string;
  specType: string;
  lastSpec: string | null;
  lastCheckedAt: number | null;
  checkInterval: number;
  webhookUrl: string | null;
  alertEmail: string | null;
  status: string;
  createdAt: number;
}

export interface Change {
  id: string;
  monitorId: string;
  severity: string;
  changeType: string;
  path: string;
  description: string;
  oldValue: string | null;
  newValue: string | null;
  detectedAt: number;
  acknowledged: boolean;
}

// --- Data Access ---

export const db = {
  users: {
    getAll: () => readJson<User>("users.json", []),
    getById: (id: string) => readJson<User>("users.json", []).find((u) => u.id === id),
    upsert: (user: User) => {
      const users = readJson<User>("users.json", []);
      const idx = users.findIndex((u) => u.id === user.id);
      if (idx >= 0) users[idx] = { ...users[idx], ...user };
      else users.push(user);
      writeJson("users.json", users);
    },
    update: (id: string, fields: Partial<User>) => {
      const users = readJson<User>("users.json", []);
      const idx = users.findIndex((u) => u.id === id);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...fields };
        writeJson("users.json", users);
      }
    },
  },
  monitors: {
    getAll: () => readJson<Monitor>("monitors.json", []),
    getByUserId: (userId: string) =>
      readJson<Monitor>("monitors.json", []).filter((m) => m.userId === userId),
    getById: (id: string) =>
      readJson<Monitor>("monitors.json", []).find((m) => m.id === id),
    insert: (monitor: Monitor) => {
      const monitors = readJson<Monitor>("monitors.json", []);
      monitors.push(monitor);
      writeJson("monitors.json", monitors);
    },
    update: (id: string, fields: Partial<Monitor>) => {
      const monitors = readJson<Monitor>("monitors.json", []);
      const idx = monitors.findIndex((m) => m.id === id);
      if (idx >= 0) {
        monitors[idx] = { ...monitors[idx], ...fields };
        writeJson("monitors.json", monitors);
      }
    },
    delete: (id: string) => {
      const monitors = readJson<Monitor>("monitors.json", []).filter(
        (m) => m.id !== id
      );
      writeJson("monitors.json", monitors);
    },
  },
  changes: {
    getAll: () => readJson<Change>("changes.json", []),
    getByMonitorId: (monitorId: string) =>
      readJson<Change>("changes.json", []).filter(
        (c) => c.monitorId === monitorId
      ),
    insert: (change: Change) => {
      const changes = readJson<Change>("changes.json", []);
      changes.push(change);
      writeJson("changes.json", changes);
    },
    deleteByMonitorId: (monitorId: string) => {
      const changes = readJson<Change>("changes.json", []).filter(
        (c) => c.monitorId !== monitorId
      );
      writeJson("changes.json", changes);
    },
  },
};
