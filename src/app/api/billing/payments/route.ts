import { requireRequestUserId } from "@/lib/auth-server";
import { getDodoConfig } from "@/lib/billing/config";
import { requireSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

type PaymentHistoryItem = {
  eventId: string;
  paymentId: string;
  amountMinor: number;
  amountDisplay: string;
  currency: string;
  status: string;
  createdAt: string;
  updatedAt: string | null;
  paymentMethod: string | null;
  invoiceUrl: string | null;
};

type DodoPaymentListItem = Record<string, unknown>;

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
]);

function formatMinorAmount(amountMinor: number, currency: string): string {
  const divisor = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100;
  const major = amountMinor / divisor;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: divisor === 1 ? 0 : 2,
    }).format(major);
  } catch {
    return `${major.toFixed(divisor === 1 ? 0 : 2)} ${currency}`;
  }
}

export async function GET(req: Request) {
  try {
    const userId = await requireRequestUserId(req);
    const db = requireSupabaseAdmin();
    const { data: profile, error } = await db
      .from("profiles")
      .select("provider_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const customerId = profile?.provider_customer_id;
    if (!customerId) {
      return Response.json({ payments: [] });
    }

    const dodoConfig = getDodoConfig();
    const baseUrl =
      dodoConfig.environment === "live_mode"
        ? "https://live.dodopayments.com"
        : "https://test.dodopayments.com";

    const listResponse = await fetch(
      `${baseUrl}/payments?customer_id=${encodeURIComponent(
        customerId
      )}&page_size=20&page_number=0`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${dodoConfig.apiKey}`,
        },
        cache: "no-store",
      }
    );

    if (!listResponse.ok) {
      const detail = await listResponse.text();
      throw new Error(`Dodo list payments failed: ${detail}`);
    }

    const listPayload = (await listResponse.json()) as {
      items?: Array<Record<string, unknown>>;
    };

    const filteredItems = (listPayload.items ?? []).filter((item) => {
      const metadata = (item.metadata ?? null) as Record<string, unknown> | null;
      return metadata?.app_user_id === userId;
    });

    if (filteredItems.length === 0) {
      return Response.json({ payments: [] });
    }

    const fromList = filteredItems.map((item) => {
      const paymentId =
        typeof item.payment_id === "string" ? item.payment_id : null;
      const amountMinor =
        typeof item.total_amount === "number" ? item.total_amount : null;
      const currency =
        typeof item.currency === "string" ? item.currency : null;
      const createdAt =
        typeof item.created_at === "string" ? item.created_at : null;

      if (!paymentId) return null;

      return {
        paymentId,
        hydrated:
          amountMinor !== null &&
          currency !== null &&
          createdAt !== null,
        payment: {
          eventId: paymentId,
          paymentId,
          amountMinor: amountMinor ?? 0,
          amountDisplay: formatMinorAmount(amountMinor ?? 0, currency ?? "USD"),
          currency: currency ?? "N/A",
          status: typeof item.status === "string" ? item.status : "unknown",
          createdAt: createdAt ?? new Date().toISOString(),
          updatedAt: typeof item.updated_at === "string" ? item.updated_at : null,
          paymentMethod:
            typeof item.payment_method === "string"
              ? item.payment_method
              : typeof item.payment_method_type === "string"
              ? item.payment_method_type
              : null,
          invoiceUrl: typeof item.invoice_url === "string" ? item.invoice_url : null,
        } as PaymentHistoryItem,
      };
    });

    const hydratedPayments = fromList
      .filter((item): item is { paymentId: string; hydrated: boolean; payment: PaymentHistoryItem } => item !== null)
      .filter((item) => item.hydrated)
      .map((item) => item.payment);

    const missingIds = fromList
      .filter((item): item is { paymentId: string; hydrated: boolean; payment: PaymentHistoryItem } => item !== null)
      .filter((item) => !item.hydrated)
      .map((item) => item.paymentId);

    const fetched = await Promise.all(
      missingIds.map(async (paymentId) => {
        const res = await fetch(`${baseUrl}/payments/${encodeURIComponent(paymentId)}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${dodoConfig.apiKey}`,
          },
          cache: "no-store",
        });
        if (!res.ok) return null;

        const detail = (await res.json()) as DodoPaymentListItem;
        return {
          eventId: paymentId,
          paymentId:
            typeof detail.payment_id === "string" ? detail.payment_id : paymentId,
          amountMinor: typeof detail.total_amount === "number" ? detail.total_amount : 0,
          amountDisplay: formatMinorAmount(
            typeof detail.total_amount === "number" ? detail.total_amount : 0,
            typeof detail.currency === "string" ? detail.currency : "USD"
          ),
          currency: typeof detail.currency === "string" ? detail.currency : "N/A",
          status: typeof detail.status === "string" ? detail.status : "unknown",
          createdAt:
            typeof detail.created_at === "string"
              ? detail.created_at
              : new Date().toISOString(),
          updatedAt: typeof detail.updated_at === "string" ? detail.updated_at : null,
          paymentMethod:
            typeof detail.payment_method === "string"
              ? detail.payment_method
              : typeof detail.payment_method_type === "string"
              ? detail.payment_method_type
              : null,
          invoiceUrl: typeof detail.invoice_url === "string" ? detail.invoice_url : null,
        } as PaymentHistoryItem;
      })
    );

    const payments = [...hydratedPayments, ...fetched]
      .filter((item): item is PaymentHistoryItem => item !== null)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return Response.json({ payments });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[billing/payments] error:", error);
    return Response.json({ error: "Failed to load payments" }, { status: 500 });
  }
}
