export type Tier = "free" | "starter" | "pro";

export interface TierLimits {
  name: string;
  maxMonitors: number;
  checkInterval: number; // seconds between checks
  webhookAlerts: boolean;
  historyDays: number;
  price: string;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    name: "Free",
    maxMonitors: 2,
    checkInterval: 86400, // 1x/day
    webhookAlerts: false,
    historyDays: 7,
    price: "Free",
  },
  starter: {
    name: "Starter",
    maxMonitors: 10,
    checkInterval: 3600, // 1x/hour
    webhookAlerts: true,
    historyDays: 30,
    price: "$9/mo",
  },
  pro: {
    name: "Pro",
    maxMonitors: 50,
    checkInterval: 300, // every 5 min
    webhookAlerts: true,
    historyDays: 90,
    price: "$29/mo",
  },
};

export function canAddMonitor(tier: Tier, currentCount: number): boolean {
  return currentCount < TIER_LIMITS[tier].maxMonitors;
}

export function isDueForCheck(
  tier: Tier,
  lastCheckedAt: string | null
): boolean {
  if (!lastCheckedAt) return true;
  const elapsed = (Date.now() - new Date(lastCheckedAt).getTime()) / 1000;
  return elapsed >= TIER_LIMITS[tier].checkInterval;
}
