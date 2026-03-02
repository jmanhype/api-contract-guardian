import { NextRequest, NextResponse } from "next/server";
import { getDb, monitors, changes } from "@/lib/db";
import { eq } from "drizzle-orm";
import { diffSpecs, fetchSpec, type Change } from "@/lib/diff-engine";
import { sendWebhookAlert } from "@/lib/alerts";
import { randomUUID } from "crypto";

// POST /api/check — run a check on a specific monitor
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { monitorId } = body;

  if (!monitorId) {
    return NextResponse.json({ error: "monitorId required" }, { status: 400 });
  }

  const db = getDb();
  const [monitor] = db
    .select()
    .from(monitors)
    .where(eq(monitors.id, monitorId))
    .all();

  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  try {
    // Fetch current spec
    const currentSpec = await fetchSpec(monitor.specUrl);

    // If no previous spec, just store it
    if (!monitor.lastSpec) {
      db.update(monitors)
        .set({
          lastSpec: JSON.stringify(currentSpec),
          lastCheckedAt: new Date(),
        })
        .where(eq(monitors.id, monitorId))
        .run();

      return NextResponse.json({
        monitorId,
        status: "baseline_stored",
        message: "First check — baseline spec stored. Changes will be detected on next check.",
      });
    }

    // Diff against previous spec
    const oldSpec = JSON.parse(monitor.lastSpec);
    const detectedChanges = diffSpecs(oldSpec, currentSpec);

    // Store changes in DB
    const breakingChanges: Change[] = [];
    for (const change of detectedChanges) {
      const changeId = randomUUID();
      db.insert(changes)
        .values({
          id: changeId,
          monitorId,
          severity: change.severity,
          changeType: change.changeType,
          path: change.path,
          description: change.description,
          oldValue: change.oldValue || null,
          newValue: change.newValue || null,
        })
        .run();

      if (change.severity === "breaking") breakingChanges.push(change);
    }

    // Update monitor with current spec
    db.update(monitors)
      .set({
        lastSpec: JSON.stringify(currentSpec),
        lastCheckedAt: new Date(),
        status: breakingChanges.length > 0 ? "alert" : "active",
      })
      .where(eq(monitors.id, monitorId))
      .run();

    // Send alerts if breaking changes found
    if (breakingChanges.length > 0 && monitor.webhookUrl) {
      await sendWebhookAlert(monitor.webhookUrl, monitor.name, detectedChanges);
    }

    return NextResponse.json({
      monitorId,
      status: "checked",
      total: detectedChanges.length,
      breaking: breakingChanges.length,
      warnings: detectedChanges.filter((c) => c.severity === "warning").length,
      info: detectedChanges.filter((c) => c.severity === "info").length,
      changes: detectedChanges,
    });
  } catch (error: any) {
    // Update monitor status to error
    db.update(monitors)
      .set({ status: "error", lastCheckedAt: new Date() })
      .where(eq(monitors.id, monitorId))
      .run();

    return NextResponse.json(
      { error: error.message || "Check failed" },
      { status: 500 }
    );
  }
}

// GET /api/check?monitorId=xxx — get change history for a monitor
export async function GET(req: NextRequest) {
  const monitorId = req.nextUrl.searchParams.get("monitorId");
  if (!monitorId)
    return NextResponse.json({ error: "monitorId required" }, { status: 400 });

  const db = getDb();
  const rows = db
    .select()
    .from(changes)
    .where(eq(changes.monitorId, monitorId))
    .all();

  return NextResponse.json(rows);
}
