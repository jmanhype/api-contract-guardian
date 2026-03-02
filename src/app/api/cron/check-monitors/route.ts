import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { diffSpecs, fetchSpec } from "@/lib/diff-engine";
import { sendWebhookAlert } from "@/lib/alerts";
import { TIER_LIMITS, type Tier } from "@/lib/tier-limits";

// GET /api/cron/check-monitors — Vercel Cron handler
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { monitorId: string; status: string; changes?: number }[] =
    [];

  // Check each tier with its schedule interval
  for (const tier of ["pro", "starter", "free"] as Tier[]) {
    const limits = TIER_LIMITS[tier];
    const monitors = await db.monitors.getDueForCheck(
      tier,
      limits.checkInterval
    );

    for (const monitor of monitors) {
      try {
        const currentSpec = await fetchSpec(monitor.url);

        if (!monitor.baseline) {
          // First check — store baseline
          await db.monitors.update(monitor.id, {
            baseline: currentSpec as Record<string, unknown>,
            last_checked_at: new Date().toISOString(),
          });
          results.push({ monitorId: monitor.id, status: "baseline_stored" });
          continue;
        }

        const detectedChanges = diffSpecs(
          monitor.baseline as Parameters<typeof diffSpecs>[0],
          currentSpec
        );

        if (detectedChanges.length > 0) {
          await db.changes.insert({
            monitor_id: monitor.id,
            changes: detectedChanges as unknown as Record<string, unknown>[],
            spec_snapshot: currentSpec as Record<string, unknown>,
          });

          // Send webhook alert for paid tiers
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

        await db.monitors.update(monitor.id, {
          baseline: currentSpec as Record<string, unknown>,
          last_checked_at: new Date().toISOString(),
        });

        results.push({
          monitorId: monitor.id,
          status: "checked",
          changes: detectedChanges.length,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown error";
        results.push({ monitorId: monitor.id, status: `error: ${message}` });
      }
    }
  }

  return NextResponse.json({
    checked: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
