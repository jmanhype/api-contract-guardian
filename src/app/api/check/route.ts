import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { diffSpecs, fetchSpec } from "@/lib/diff-engine";
import { sendWebhookAlert } from "@/lib/alerts";
import { TIER_LIMITS, type Tier } from "@/lib/tier-limits";

// POST /api/check — run a check on a specific monitor
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { monitorId } = body;

  if (!monitorId) {
    return NextResponse.json({ error: "monitorId required" }, { status: 400 });
  }

  const monitor = await db.monitors.getById(monitorId);
  if (!monitor || monitor.user_id !== user.id) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  try {
    const currentSpec = await fetchSpec(monitor.url);

    if (!monitor.baseline) {
      await db.monitors.update(monitorId, {
        baseline: currentSpec as Record<string, unknown>,
        last_checked_at: new Date().toISOString(),
      });
      return NextResponse.json({
        monitorId,
        status: "baseline_stored",
        message:
          "First check — baseline spec stored. Changes will be detected on next check.",
      });
    }

    const detectedChanges = diffSpecs(
      monitor.baseline as Parameters<typeof diffSpecs>[0],
      currentSpec
    );

    if (detectedChanges.length > 0) {
      await db.changes.insert({
        monitor_id: monitorId,
        changes: detectedChanges as unknown as Record<string, unknown>[],
        spec_snapshot: currentSpec as Record<string, unknown>,
      });

      // Send webhook for paid tiers
      const limits = TIER_LIMITS[user.plan as Tier];
      const breaking = detectedChanges.filter(
        (c) => c.severity === "breaking"
      );
      if (breaking.length > 0 && monitor.webhook_url && limits.webhookAlerts) {
        await sendWebhookAlert(
          monitor.webhook_url,
          monitor.name,
          detectedChanges
        );
      }
    }

    await db.monitors.update(monitorId, {
      baseline: currentSpec as Record<string, unknown>,
      last_checked_at: new Date().toISOString(),
    });

    return NextResponse.json({
      monitorId,
      status: "checked",
      total: detectedChanges.length,
      breaking: detectedChanges.filter((c) => c.severity === "breaking").length,
      warnings: detectedChanges.filter((c) => c.severity === "warning").length,
      info: detectedChanges.filter((c) => c.severity === "info").length,
      changes: detectedChanges,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/check?monitorId=xxx — get change history
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const monitorId = req.nextUrl.searchParams.get("monitorId");
  if (!monitorId) {
    return NextResponse.json(
      { error: "monitorId required" },
      { status: 400 }
    );
  }

  // Verify ownership
  const monitor = await db.monitors.getById(monitorId);
  if (!monitor || monitor.user_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = await db.changes.getByMonitorId(monitorId);
  return NextResponse.json(rows);
}
