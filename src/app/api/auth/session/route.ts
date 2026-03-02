import { NextRequest, NextResponse } from "next/server";

// POST /api/auth/session — set auth cookies from tokens
export async function POST(req: NextRequest) {
  const { access_token, refresh_token } = await req.json();

  if (!access_token) {
    return NextResponse.json({ error: "Missing access_token" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("sb-access-token", access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  if (refresh_token) {
    response.cookies.set("sb-refresh-token", refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
  }

  return response;
}
