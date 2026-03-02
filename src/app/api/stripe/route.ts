import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

// POST /api/stripe — create a Stripe Checkout session
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { plan, userId, email } = body;

  if (!plan || !["starter", "pro"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const priceId =
    plan === "starter"
      ? process.env.STRIPE_STARTER_PRICE_ID
      : process.env.STRIPE_PRO_PRICE_ID;

  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured" },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/dashboard?upgraded=true`,
      cancel_url: `${baseUrl}/dashboard?cancelled=true`,
      client_reference_id: userId || "demo-user",
      customer_email: email || undefined,
      metadata: { plan, userId: userId || "demo-user" },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
