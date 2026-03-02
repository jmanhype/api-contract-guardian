import type { Change } from "./diff-engine";

/**
 * Send alert via webhook (Slack, Discord, custom).
 */
export async function sendWebhookAlert(
  webhookUrl: string,
  monitorName: string,
  changes: Change[]
) {
  const breaking = changes.filter((c) => c.severity === "breaking");
  const warnings = changes.filter((c) => c.severity === "warning");
  const info = changes.filter((c) => c.severity === "info");

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `🚨 API Contract Guardian: ${monitorName}`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${breaking.length} breaking* | ${warnings.length} warnings | ${info.length} info changes detected`,
      },
    },
  ];

  for (const c of breaking.slice(0, 5)) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🔴 *${c.changeType}*: \`${c.path}\`\n${c.description}`,
      },
    });
  }

  if (breaking.length > 5) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_...and ${breaking.length - 5} more breaking changes_`,
      },
    });
  }

  // Try Slack block format first, fall back to simple JSON
  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `🚨 ${monitorName}: ${breaking.length} breaking changes detected`,
        blocks,
      }),
      signal: AbortSignal.timeout(10000),
    });
    return resp.ok;
  } catch {
    // Try simple payload for non-Slack webhooks
    try {
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monitor: monitorName,
          total_changes: changes.length,
          breaking: breaking.length,
          warnings: warnings.length,
          changes: changes.slice(0, 20),
        }),
        signal: AbortSignal.timeout(10000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }
}
