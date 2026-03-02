"use client";

import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || "Failed to send login link");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="text-3xl">🛡️</span>
          <span className="text-xl font-bold tracking-tight">
            API Contract Guardian
          </span>
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="text-3xl mb-4">📧</div>
            <h2 className="text-lg font-semibold mb-2">Check your email</h2>
            <p className="text-sm text-zinc-400">
              We sent a login link to <strong className="text-zinc-200">{email}</strong>.
              Click the link to sign in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-6 text-sm text-orange-400 hover:text-orange-300"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-2 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <label className="block text-sm text-zinc-400 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm focus:border-orange-500 focus:outline-none mb-4"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-orange-600 px-4 py-3 text-sm font-medium hover:bg-orange-500 transition disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-zinc-500">
              Free plan includes 2 monitors with daily checks.
              <br />
              <Link href="/" className="text-orange-400 hover:text-orange-300">
                View pricing
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
