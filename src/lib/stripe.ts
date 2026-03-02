import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-18.acacia" as any,
});

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

export function getPlanLimits(plan: string) {
  return PLANS[plan as PlanKey] || PLANS.free;
}
