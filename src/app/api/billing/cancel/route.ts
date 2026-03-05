import { requireRequestUserId } from "@/lib/auth-server";
import { getDodoConfig } from "@/lib/billing/config";
import { requireSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await requireRequestUserId(req);
    const db = requireSupabaseAdmin();

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("provider_subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const subscriptionId = profile?.provider_subscription_id;
    if (!subscriptionId) {
      return Response.json(
        { error: "No active subscription found for this account" },
        { status: 400 }
      );
    }

    const dodo = getDodoConfig();
    const baseUrl =
      dodo.environment === "live_mode"
        ? "https://live.dodopayments.com"
        : "https://test.dodopayments.com";

    const cancelResponse = await fetch(
      `${baseUrl}/subscriptions/${encodeURIComponent(subscriptionId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${dodo.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancel_at_next_billing_date: true,
        }),
      }
    );

    if (!cancelResponse.ok) {
      const details = await cancelResponse.text();
      return Response.json(
        { error: "Failed to cancel subscription", details },
        { status: cancelResponse.status }
      );
    }

    const payload = (await cancelResponse.json()) as Record<string, unknown>;
    const nextBillingDate =
      typeof payload.next_billing_date === "string"
        ? payload.next_billing_date
        : null;

    const { error: upsertError } = await db.from("profiles").upsert(
      {
        user_id: userId,
        billing_status:
          typeof payload.status === "string" ? payload.status : "active",
        access_expires_at: nextBillingDate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) throw upsertError;

    return Response.json({
      ok: true,
      message: "Subscription cancellation scheduled for next billing date.",
      subscription: {
        status: payload.status ?? "active",
        cancelAtNextBillingDate:
          payload.cancel_at_next_billing_date ?? true,
        nextBillingDate,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[billing/cancel] error:", error);
    return Response.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
