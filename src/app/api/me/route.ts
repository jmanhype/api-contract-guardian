import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";

// GET /api/me — return current user info
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email,
    plan: user.plan,
  });
}
