import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

// POST /api/webhooks — Stripe webhook handler
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const plan = session.metadata?.plan || "starter";
      if (userId) {
        db.users.update(userId, {
          plan,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = sub.customer as string;
      const allUsers = db.users.getAll();
      const user = allUsers.find((u) => u.stripeCustomerId === customerId);
      if (user) {
        db.users.update(user.id, { plan: "free", stripeSubscriptionId: null });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
