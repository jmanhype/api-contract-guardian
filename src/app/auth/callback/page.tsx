"use client";

import { useEffect, useState } from "react";

export default function AuthCallback() {
  const [status, setStatus] = useState("Signing you in...");

  useEffect(() => {
    async function handleCallback() {
      // Supabase implicit flow puts tokens in the hash fragment
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      // Also check query params for code-based flow
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        // PKCE flow — redirect to API route
        window.location.href = `/api/auth/callback?code=${encodeURIComponent(code)}`;
        return;
      }

      if (!accessToken) {
        setStatus("Authentication failed — no token received.");
        setTimeout(() => (window.location.href = "/login?error=no_token"), 2000);
        return;
      }

      // Send tokens to server to set httpOnly cookies
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken || "",
        }),
      });

      if (res.ok) {
        setStatus("Success! Redirecting to dashboard...");
        window.location.href = "/dashboard";
      } else {
        setStatus("Failed to create session.");
        setTimeout(() => (window.location.href = "/login?error=session_failed"), 2000);
      }
    }

    handleCallback();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>🛡️</div>
        <p style={{ fontSize: 16, opacity: 0.7 }}>{status}</p>
      </div>
    </div>
  );
}
