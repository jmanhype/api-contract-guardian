import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";

const DEMO_USER = "demo-user";

function ensureDemoUser() {
  if (!db.users.getById(DEMO_USER)) {
    db.users.upsert({
      id: DEMO_USER,
      email: "demo@example.com",
      name: "Demo User",
      githubId: null,
      githubToken: null,
      plan: "free",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      createdAt: Date.now(),
    });
  }
}

// GET /api/monitors
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || DEMO_USER;
  ensureDemoUser();
  const rows = db.monitors.getByUserId(userId);
  return NextResponse.json(rows);
}

// POST /api/monitors
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || DEMO_USER;
  ensureDemoUser();
  const body = await req.json();
  const { name, specUrl, specType, webhookUrl, alertEmail } = body;

  if (!name || !specUrl) {
    return NextResponse.json({ error: "name and specUrl are required" }, { status: 400 });
  }

  const id = randomUUID();
  db.monitors.insert({
    id,
    userId,
    name,
    specUrl,
    specType: specType || "url",
    lastSpec: null,
    lastCheckedAt: null,
    checkInterval: 3600,
    webhookUrl: webhookUrl || null,
    alertEmail: alertEmail || null,
    status: "active",
    createdAt: Date.now(),
  });

  return NextResponse.json({ id, name, specUrl, status: "active" }, { status: 201 });
}

// DELETE /api/monitors?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  db.changes.deleteByMonitorId(id);
  db.monitors.delete(id);
  return NextResponse.json({ deleted: true });
}
