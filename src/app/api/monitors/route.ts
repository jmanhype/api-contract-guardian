import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { canAddMonitor, type Tier } from "@/lib/tier-limits";

// GET /api/monitors
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.monitors.getByUserId(user.id);
  return NextResponse.json(rows);
}

// POST /api/monitors
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, url, webhookUrl } = body;

  if (!name || !url) {
    return NextResponse.json(
      { error: "name and url are required" },
      { status: 400 }
    );
  }

  // Enforce tier limits
  const currentCount = await db.monitors.countByUserId(user.id);
  if (!canAddMonitor(user.plan as Tier, currentCount)) {
    return NextResponse.json(
      {
        error: "Monitor limit reached. Upgrade your plan to add more monitors.",
        limit: true,
      },
      { status: 403 }
    );
  }

  const monitor = await db.monitors.insert({
    user_id: user.id,
    name,
    url,
    schedule: "daily",
    webhook_url: webhookUrl || null,
    baseline: null,
    last_checked_at: null,
  });

  return NextResponse.json(monitor, { status: 201 });
}

// DELETE /api/monitors?id=xxx
export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Verify ownership
  const monitor = await db.monitors.getById(id);
  if (!monitor || monitor.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.changes.deleteByMonitorId(id);
  await db.monitors.delete(id);
  return NextResponse.json({ deleted: true });
}
