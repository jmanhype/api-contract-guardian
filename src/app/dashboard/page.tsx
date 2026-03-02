"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Monitor {
  id: string;
  name: string;
  specUrl: string;
  status: string;
  lastCheckedAt: string | null;
  webhookUrl: string | null;
  alertEmail: string | null;
}

interface Change {
  id: string;
  severity: "breaking" | "warning" | "info";
  changeType: string;
  path: string;
  description: string;
  detectedAt: string;
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

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CheckResult | null>(null);
  const [changeHistory, setChangeHistory] = useState<Change[]>([]);
  const [selectedMonitor, setSelectedMonitor] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formWebhook, setFormWebhook] = useState("");
  const [formEmail, setFormEmail] = useState("");

  const loadMonitors = useCallback(async () => {
    const res = await fetch("/api/monitors");
    const data = await res.json();
    setMonitors(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMonitors();
  }, [loadMonitors]);

  async function addMonitor(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/monitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formName,
        specUrl: formUrl,
        webhookUrl: formWebhook || undefined,
        alertEmail: formEmail || undefined,
      }),
    });
    if (res.ok) {
      setFormName("");
      setFormUrl("");
      setFormWebhook("");
      setFormEmail("");
      setShowForm(false);
      loadMonitors();
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
    } catch (err) {
      setLastResult({
        monitorId,
        status: "error",
        message: "Check failed",
      });
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
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400">
            Free Plan
          </span>
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
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Webhook URL (Slack/Discord)
                </label>
                <input
                  type="url"
                  value={formWebhook}
                  onChange={(e) => setFormWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">
                  Alert Email
                </label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="dev@company.com"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none"
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

        {/* Last check result */}
        {lastResult && (
          <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 animate-fade-in">
            <div className="flex items-center gap-3">
              {lastResult.status === "baseline_stored" ? (
                <span className="text-blue-400 text-sm">
                  📋 Baseline stored. Next check will detect changes.
                </span>
              ) : lastResult.breaking && lastResult.breaking > 0 ? (
                <span className="text-red-400 text-sm">
                  🚨 {lastResult.breaking} breaking change
                  {lastResult.breaking > 1 ? "s" : ""} detected!
                </span>
              ) : lastResult.total === 0 ? (
                <span className="text-green-400 text-sm">
                  ✅ No changes detected.
                </span>
              ) : (
                <span className="text-yellow-400 text-sm">
                  ⚠️ {lastResult.total} change
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
        {loading ? (
          <div className="text-center py-20 text-zinc-500">Loading...</div>
        ) : monitors.length === 0 ? (
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
                        m.status === "active"
                          ? "bg-green-500"
                          : m.status === "alert"
                          ? "bg-red-500 pulse-dot"
                          : m.status === "error"
                          ? "bg-yellow-500"
                          : "bg-zinc-500"
                      }`}
                    />
                    <div>
                      <h3 className="font-semibold">{m.name}</h3>
                      <p className="text-xs text-zinc-500 font-mono mt-0.5 max-w-md truncate">
                        {m.specUrl}
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

                {/* Change history for this monitor */}
                {selectedMonitor === m.id && changeHistory.length > 0 && (
                  <div className="mt-4 border-t border-zinc-800 pt-4 space-y-2 animate-fade-in">
                    <h4 className="text-sm font-semibold text-zinc-400">
                      Change History ({changeHistory.length})
                    </h4>
                    {changeHistory.slice(0, 20).map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-2 text-xs"
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
                          <div className="text-zinc-500">{c.description}</div>
                        </div>
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
