import { createCheckoutSession } from "@dodopayments/core";
import { z } from "zod";
import { getDodoConfig, getPlanConfig, type PlanCode } from "@/lib/billing/config";
import { requireRequestSupabase } from "@/lib/auth-server";

export const runtime = "nodejs";

const CheckoutBodySchema = z.object({
  planCode: z.enum(["PRO"]).optional(),
});

function getCheckoutUrls(baseUrl: string) {
  return {
    success: `${baseUrl}/dashboard`,
    cancel: `${baseUrl}/dashboard`,
  } as const;
}

export async function POST(req: Request) {
  try {
    CheckoutBodySchema.parse(await req.json().catch(() => ({})));
    const db = requireRequestSupabase(req);
    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dodo = getDodoConfig();
    const plan = getPlanConfig("PRO" as PlanCode);
    const urls = getCheckoutUrls(dodo.returnUrlBase);

    const session = await createCheckoutSession(
      {
        product_cart: [{ product_id: plan.productId, quantity: 1 }],
        customer: {
          email: user.email ?? "",
          name:
            (user.user_metadata?.full_name as string | undefined) ??
            [user.user_metadata?.first_name, user.user_metadata?.last_name].filter(Boolean).join(" "),
        },
        return_url: urls.success,
        metadata: {
          app_user_id: user.id,
          plan_code: plan.code,
          cancel_url: urls.cancel,
        },
      },
      {
        bearerToken: dodo.apiKey,
        environment: dodo.environment as "test_mode" | "live_mode",
      }
    );

    return Response.json({ checkoutUrl: session.checkout_url });
  } catch (error) {
    console.error("[billing/checkout] error:", error);
    return Response.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
