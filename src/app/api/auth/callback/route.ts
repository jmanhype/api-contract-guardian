import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/auth/callback — exchange auth code/token for session
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const token_hash = req.nextUrl.searchParams.get("token_hash");
  const type = req.nextUrl.searchParams.get("type") || "magiclink";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let session;

  if (code) {
    // OAuth code exchange
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.session) {
      return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
    }
    session = data.session;
  } else if (token_hash) {
    // Magic link token verification
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "magiclink" | "email",
    });
    if (error || !data.session) {
      return NextResponse.redirect(new URL("/login?error=auth_failed", req.url));
    }
    session = data.session;
  } else {
    return NextResponse.redirect(new URL("/login?error=no_code", req.url));
  }

  // Set auth cookies
  const response = NextResponse.redirect(new URL("/dashboard", req.url));
  response.cookies.set("sb-access-token", session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  response.cookies.set("sb-refresh-token", session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}
