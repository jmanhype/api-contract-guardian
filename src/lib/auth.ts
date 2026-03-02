import { NextRequest } from "next/server";
import { getSupabase } from "./supabase";

export interface AcgUser {
  id: string;
  auth_id: string;
  email: string;
  plan: "free" | "starter" | "pro";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
}

/**
 * Extract authenticated user from request.
 * Reads the Supabase access token from Authorization header or sb-access-token cookie.
 * Returns the acg_users row, or null if not authenticated.
 */
export async function getUser(req: NextRequest): Promise<AcgUser | null> {
  const headerToken = req.headers.get("authorization")?.replace("Bearer ", "");
  const cookieToken = req.cookies.get("sb-access-token")?.value;
  const token = headerToken || cookieToken;
  if (!token) return null;

  const supabase = getSupabase();

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !authUser) return null;

  const { data: existing } = await supabase
    .from("acg_users")
    .select("*")
    .eq("auth_id", authUser.id)
    .single();

  if (existing) return existing as AcgUser;

  const { data: created, error: insertErr } = await supabase
    .from("acg_users")
    .insert({
      auth_id: authUser.id,
      email: authUser.email || "",
      plan: "free",
    })
    .select()
    .single();

  if (insertErr) return null;
  return created as AcgUser;
}
