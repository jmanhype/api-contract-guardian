"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Monitor {
  id: string;
  name: string;
  url: string;
  last_checked_at: string | null;
  webhook_url: string | null;
  baseline: unknown | null;
}

interface ChangeRecord {
  id: string;
  changes: Change[];
  checked_at: string;
}

interface Change {
  severity: "breaking" | "warning" | "info";
  changeType: string;
  path: string;
  description: string;
}

interface CheckResult {
  monitorId: string;
  status: string;
  total?: number;
  breaking?: number;
  warnings?: number;
  info?: number;
  changes?: Change[];
  message?: string;
  error?: string;
  limit?: boolean;
}

interface UserInfo {
  email: string;
  plan: string;
}

const SEVERITY_COLORS = {
  breaking: "bg-red-500/10 text-red-400 border-red-500/30",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/30",
};

const SEVERITY_DOTS = {
  breaking: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-zinc-800 text-zinc-400",
  starter: "bg-orange-600/20 text-orange-400",
  pro: "bg-purple-600/20 text-purple-400",
};

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [checking, setChecking] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CheckResult | null>(null);
  const [changeHistory, setChangeHistory] = useState<ChangeRecord[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formWebhook, setFormWebhook] = useState("");

  const loadMonitors = useCallback(async () => {
    const res = await fetch("/api/monitors");
    if (res.status === 401) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMonitors(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Load user info
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setUser(d);
        else setAuthed(false);
      })
      .catch(() => setAuthed(false));

    loadMonitors();
  }, [loadMonitors]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authed && !loading) {
      window.location.href = "/login";
    }
  }, [authed, loading]);

  async function addMonitor(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        url: formUrl,
        webhookUrl: formWebhook || undefined,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setFormName("");
      setFormUrl("");
      setFormWebhook("");
      setShowForm(false);
      setLastResult(null);
      loadMonitors();
    } else if (data.limit) {
      setLastResult({
        monitorId: "",
        status: "limit",
        error: data.error,
        limit: true,
      });
    }
  }

  async function runCheck(monitorId: string) {
    setChecking(monitorId);
    setLastResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitorId }),
      });
      const data = await res.json();
      setLastResult(data);
      loadMonitors();
    } catch {
      setLastResult({ monitorId, status: "error", message: "Check failed" });
    }
    setChecking(null);
  }

  async function loadChanges(monitorId: string) {
    setSelectedMonitor(monitorId === selectedMonitor ? null : monitorId);
    if (monitorId !== selectedMonitor) {
      const res = await fetch(`/api/check?monitorId=${monitorId}`);
      const data = await res.json();
      setChangeHistory(data);
    }
  }

  async function deleteMonitor(id: string) {
    await fetch(`/api/monitors?id=${id}`, { method: "DELETE" });
    loadMonitors();
    if (selectedMonitor === id) setSelectedMonitor(null);
  }

  async function upgrade(plan: string) {
    const res = await fetch("/api/stripe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  function logout() {
    document.cookie =
      "sb-access-token=; Max-Age=0; path=/";
    document.cookie =
      "sb-refresh-token=; Max-Age=0; path=/";
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🛡️</span>
            <span className="text-lg font-bold tracking-tight">
              API Contract Guardian
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs capitalize ${
                PLAN_COLORS[user?.plan || "free"]
              }`}
            >
              {user?.plan || "free"} Plan
            </span>
            {user?.plan === "free" && (
              <button
                onClick={() => upgrade("starter")}
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium hover:bg-orange-500 transition"
              >
                Upgrade
              </button>
            )}
            <button
              onClick={logout}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Header row */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">API Monitors</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {monitors.length} monitor{monitors.length !== 1 ? "s" : ""} active
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium hover:bg-orange-500 transition"
          >
            + Add Monitor
          </button>
        </div>

        {/* Add Monitor Form */}
        {showForm && (
          <form
            onSubmit={addMonitor}
            className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 animate-fade-in"
          >
            <h3 className="font-semibold text-lg mb-4">Add API Monitor</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Monitor Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Stripe API"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  OpenAPI Spec URL
                </label>
                <input
                  type="url"
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://api.example.com/openapi.json"
                  required
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-zinc-400 mb-1">
                  Webhook URL (Slack/Discord) — {user?.plan === "free" ? "Starter+ only" : "enabled"}
                </label>
                <input
                  type="url"
                  value={formWebhook}
                  onChange={(e) => setFormWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  disabled={user?.plan === "free"}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none disabled:opacity-40"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                type="submit"
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium hover:bg-orange-500 transition"
              >
                Create Monitor
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Result / Alert banner */}
        {lastResult && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              {lastResult.limit ? (
                <div className="flex items-center justify-between w-full">
                  <span className="text-orange-400 text-sm">
                    {lastResult.error}
                  </span>
                  {user?.plan === "free" && (
                    <button
                      onClick={() => upgrade("starter")}
                      className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium hover:bg-orange-500 transition"
                    >
                      Upgrade to Starter — $9/mo
                    </button>
                  )}
                </div>
              ) : lastResult.status === "baseline_stored" ? (
                <span className="text-blue-400 text-sm">
                  Baseline stored. Next check will detect changes.
                </span>
              ) : lastResult.breaking && lastResult.breaking > 0 ? (
                <span className="text-red-400 text-sm">
                  {lastResult.breaking} breaking change
                  {lastResult.breaking > 1 ? "s" : ""} detected!
                </span>
              ) : lastResult.total === 0 ? (
                <span className="text-green-400 text-sm">
                  No changes detected.
                </span>
              ) : (
                <span className="text-yellow-400 text-sm">
                  {lastResult.total} change
                  {(lastResult.total || 0) > 1 ? "s" : ""} detected (
                  {lastResult.warnings} warnings, {lastResult.info} info)
                </span>
              )}
            </div>
            {lastResult.changes && lastResult.changes.length > 0 && (
              <div className="mt-3 space-y-2">
                {lastResult.changes.slice(0, 10).map((c, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-3 py-2 text-xs ${
                      SEVERITY_COLORS[c.severity]
                    }`}
                  >
                    <span className="font-mono font-semibold">
                      {c.changeType}
                    </span>{" "}
                    — <code>{c.path}</code>
                    <div className="mt-1 text-zinc-400">{c.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Monitor List */}
        {monitors.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-semibold">No monitors yet</h3>
            <p className="text-sm text-zinc-400 mt-2">
              Add your first API spec URL to start monitoring for breaking
              changes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {monitors.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        m.baseline
                          ? "bg-green-500"
                          : "bg-zinc-500"
                      }`}
                    />
                    <div>
                      <h3 className="font-semibold">{m.name}</h3>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5 max-w-md truncate">
                        {m.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => loadChanges(m.id)}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-500 transition"
                    >
                      History
                    </button>
                    <button
                      onClick={() => runCheck(m.id)}
                      disabled={checking === m.id}
                      className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium hover:bg-zinc-700 transition disabled:opacity-50"
                    >
                      {checking === m.id ? "Checking..." : "Run Check"}
                    </button>
                    <button
                      onClick={() => deleteMonitor(m.id)}
                      className="rounded-lg px-2 py-1.5 text-xs text-zinc-600 hover:text-red-400 transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {selectedMonitor === m.id && changeHistory.length > 0 && (
                  <div className="mt-4 border-t border-zinc-800 pt-4 space-y-2 animate-fade-in">
                    <h4 className="text-sm font-semibold text-zinc-400">
                      Change History ({changeHistory.length})
                    </h4>
                    {changeHistory.slice(0, 20).map((record) => (
                      <div key={record.id} className="space-y-1">
                        <div className="text-xs text-zinc-600">
                          {new Date(record.checked_at).toLocaleString()}
                        </div>
                        {record.changes.map((c, j) => (
                          <div
                            key={j}
                            className="flex items-start gap-2 text-xs ml-3"
                          >
                            <div
                              className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                SEVERITY_DOTS[c.severity]
                              }`}
                            />
                            <div>
                              <span className="font-mono font-semibold text-zinc-300">
                                {c.changeType}
                              </span>{" "}
                              <code className="text-zinc-500">{c.path}</code>
                              <div className="text-zinc-500">
                                {c.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
