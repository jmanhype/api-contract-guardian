import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
    _stripe = new Stripe(key, { apiVersion: "2025-12-18.acacia" as any });
  }
  return _stripe;
}

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    monitors: 2,
    checksPerDay: 4,
    features: ["2 API monitors", "4 checks/day", "Email alerts"],
  },
  starter: {
    name: "Starter",
    price: 9,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    monitors: 10,
    checksPerDay: 24,
    features: [
      "10 API monitors",
      "Hourly checks",
      "Slack + webhook alerts",
      "Change history (30 days)",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    monitors: 50,
    checksPerDay: 288,
    features: [
      "50 API monitors",
      "5-minute checks",
      "Slack + webhook + email alerts",
      "Unlimited change history",
      "GitHub repo monitoring",
      "Priority support",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;
