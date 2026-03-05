import { CustomerPortal } from "@dodopayments/nextjs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY ?? "";
  const environment = (process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode") as
    | "test_mode"
    | "live_mode";

  if (!bearerToken) {
    return Response.json(
      { error: "DodoPayments API key is not configured" },
      { status: 500 }
    );
  }

  const handler = CustomerPortal({
    bearerToken,
    environment,
  });

  return handler(req as any);
}
