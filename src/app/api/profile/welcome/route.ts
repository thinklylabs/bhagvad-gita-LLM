import { markPaidWelcomeSeen } from "@/lib/billing/entitlement";
import { requireRequestUserId } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await requireRequestUserId(req);
    await markPaidWelcomeSeen(userId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[profile/welcome] error:", error);
    return Response.json({ error: "Failed to update welcome status" }, { status: 500 });
  }
}
