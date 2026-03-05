import { requireRequestUserId } from "@/lib/auth-server";
import { requireSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const userId = await requireRequestUserId(req);
    const db = requireSupabaseAdmin();
    const { data, error } = await db
      .from("profiles")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;

    const customerId = data?.provider_customer_id;
    if (!customerId) {
      return Response.json(
        { error: "No DodoPayments customer found for this account" },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    url.pathname = "/api/billing/customer-portal";
    url.searchParams.set("customer_id", customerId);

    const proxied = new Request(url.toString(), {
      method: "GET",
      headers: req.headers,
    });

    const response = await fetch(proxied);
    if (!response.ok) {
      const text = await response.text();
      return Response.json(
        { error: "Failed to open customer portal", details: text },
        { status: response.status }
      );
    }

    const payload = (await response.json()) as {
      customer_portal_url?: string;
      portal_url?: string;
      url?: string;
    };

    const portalUrl =
      payload.customer_portal_url ?? payload.portal_url ?? payload.url;

    if (!portalUrl) {
      return Response.json(
        { error: "Could not get portal URL from DodoPayments" },
        { status: 500 }
      );
    }

    return Response.json({ portalUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[billing/portal] error:", error);
    return Response.json({ error: "Failed to open billing portal" }, { status: 500 });
  }
}
