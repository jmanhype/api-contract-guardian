import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getDb, users } from "@/lib/db";
import { eq } from "drizzle-orm";

// POST /api/webhooks — Stripe webhook handler
export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 }
    );
  }

  const db = getDb();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const plan = session.metadata?.plan || "starter";
      if (userId) {
        db.update(users)
          .set({
            plan,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
          })
          .where(eq(users.id, userId))
          .run();
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = sub.customer as string;
      // Find user by stripe customer ID and downgrade
      const allUsers = db.select().from(users).all();
      const user = allUsers.find((u: any) => u.stripeCustomerId === customerId);
      if (user) {
        db.update(users)
          .set({ plan: "free", stripeSubscriptionId: null })
          .where(eq(users.id, (user as any).id))
          .run();
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
