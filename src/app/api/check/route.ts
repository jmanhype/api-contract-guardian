import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { diffSpecs, fetchSpec, type Change as DiffChange } from "@/lib/diff-engine";
import { sendWebhookAlert } from "@/lib/alerts";
import { randomUUID } from "crypto";

// POST /api/check — run a check on a specific monitor
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { monitorId } = body;

  if (!monitorId) {
    return NextResponse.json({ error: "monitorId required" }, { status: 400 });
  }

  const monitor = db.monitors.getById(monitorId);
  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  try {
    const currentSpec = await fetchSpec(monitor.specUrl);

    if (!monitor.lastSpec) {
      db.monitors.update(monitorId, {
        lastSpec: JSON.stringify(currentSpec),
        lastCheckedAt: Date.now(),
      });
      return NextResponse.json({
        monitorId,
        status: "baseline_stored",
        message: "First check — baseline spec stored. Changes will be detected on next check.",
      });
    }

    const oldSpec = JSON.parse(monitor.lastSpec);
    const detectedChanges = diffSpecs(oldSpec, currentSpec);

    const breakingChanges: DiffChange[] = [];
    for (const change of detectedChanges) {
      db.changes.insert({
        id: randomUUID(),
        monitorId,
        severity: change.severity,
        changeType: change.changeType,
        path: change.path,
        description: change.description,
        oldValue: change.oldValue || null,
        newValue: change.newValue || null,
        detectedAt: Date.now(),
        acknowledged: false,
      });
      if (change.severity === "breaking") breakingChanges.push(change);
    }

    db.monitors.update(monitorId, {
      lastSpec: JSON.stringify(currentSpec),
      lastCheckedAt: Date.now(),
      status: breakingChanges.length > 0 ? "alert" : "active",
    });

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
    db.monitors.update(monitorId, { status: "error", lastCheckedAt: Date.now() });
    return NextResponse.json({ error: error.message || "Check failed" }, { status: 500 });
  }
}

// GET /api/check?monitorId=xxx — get change history
export async function GET(req: NextRequest) {
  const monitorId = req.nextUrl.searchParams.get("monitorId");
  if (!monitorId)
    return NextResponse.json({ error: "monitorId required" }, { status: 400 });
  const rows = db.changes.getByMonitorId(monitorId);
  return NextResponse.json(rows);
}
