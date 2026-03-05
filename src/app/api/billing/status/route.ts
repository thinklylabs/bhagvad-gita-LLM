import {
  getEntitlementRow,
  getFreeMessageUsage,
  isEntitlementActive,
} from "@/lib/billing/entitlement";
import { requireRequestUserId } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const userId = await requireRequestUserId(req);
    const [row, freeUsage] = await Promise.all([
      getEntitlementRow(userId),
      getFreeMessageUsage(userId),
    ]);
    const active = isEntitlementActive(row);

    return Response.json({
      hasAccess: active,
      subscription: row,
      freeMessageLimit: freeUsage.limit,
      freeMessagesUsed: freeUsage.used,
      freeMessagesRemaining: freeUsage.remaining,
      trialLimitReached: freeUsage.reached,
      showPaidWelcomePopup:
        active === true && row?.has_seen_paid_welcome === false,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[billing/status] error:", error);
    return Response.json({ error: "Failed to fetch billing status" }, { status: 500 });
  }
}
