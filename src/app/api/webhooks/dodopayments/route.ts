import { Webhooks } from "@dodopayments/nextjs";
import { upsertEntitlementFromWebhook } from "@/lib/billing/entitlement";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const webhookKey =
    process.env.DODO_PAYMENTS_WEBHOOK_KEY ??
    process.env.DODO_PAYMENTS_WEBHOOK_SECRET ??
    "";

  if (!webhookKey) {
    return Response.json({ error: "Webhook secret is not configured" }, { status: 500 });
  }

  const handler = Webhooks({
    webhookKey,
    onPayload: async (payload) => {
      try {
        await upsertEntitlementFromWebhook(payload);
      } catch (error) {
        console.error("[billing/webhook] processing failed:", error);
        throw error;
      }
    },
  });

  return handler(req as any);
}
