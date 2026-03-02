import { NextRequest, NextResponse } from "next/server";
import { getDb, monitors, changes, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const DEMO_USER = "demo-user";

function ensureDemoUser() {
  const db = getDb();
  const existing = db.select().from(users).where(eq(users.id, DEMO_USER)).all();
  if (existing.length === 0) {
    db.insert(users)
      .values({ id: DEMO_USER, email: "demo@example.com", name: "Demo User" })
      .run();
  }
}

// GET /api/monitors — list all monitors
export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || DEMO_USER;
  ensureDemoUser();
  const db = getDb();
  const rows = db.select().from(monitors).where(eq(monitors.userId, userId)).all();
  return NextResponse.json(rows);
}

// POST /api/monitors — create a new monitor
export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id") || DEMO_USER;
  ensureDemoUser();
  const body = await req.json();
  const { name, specUrl, specType, webhookUrl, alertEmail } = body;

  if (!name || !specUrl) {
    return NextResponse.json(
      { error: "name and specUrl are required" },
      { status: 400 }
    );
  }

  const db = getDb();
  const id = randomUUID();
  db.insert(monitors)
    .values({
      id,
      userId,
      name,
      specUrl,
      specType: specType || "url",
      webhookUrl: webhookUrl || null,
      alertEmail: alertEmail || null,
    })
    .run();

  return NextResponse.json({ id, name, specUrl, status: "active" }, { status: 201 });
}

// DELETE /api/monitors?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = getDb();
  db.delete(changes).where(eq(changes.monitorId, id)).run();
  db.delete(monitors).where(eq(monitors.id, id)).run();

  return NextResponse.json({ deleted: true });
}
