import type { WebhookPayload } from "@dodopayments/core";
import { requireSupabaseAdmin } from "@/lib/supabase";

export type InternalBillingStatus =
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "inactive";

type BillingSubscriptionRow = {
  user_id: string;
  subscription_active: boolean;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  plan_code: string | null;
  billing_status: InternalBillingStatus;
  access_expires_at: string | null;
  has_seen_paid_welcome: boolean;
  updated_at: string;
};

export const FREE_MESSAGE_LIMIT = 3;

type EntitlementStatusShape = Pick<
  BillingSubscriptionRow,
  "subscription_active" | "billing_status" | "access_expires_at"
>;

function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

function extractUserId(payload: WebhookPayload): string | null {
  const data = payload.data as Record<string, unknown>;
  const dataMetadata = (data.metadata ?? null) as Record<string, unknown> | null;
  const customer = (data.customer ?? null) as Record<string, unknown> | null;
  const customerMetadata = (customer?.metadata ?? null) as Record<string, unknown> | null;

  const fromData = dataMetadata?.app_user_id;
  if (typeof fromData === "string" && fromData.length > 0) return fromData;

  const fromCustomer = customerMetadata?.app_user_id;
  if (typeof fromCustomer === "string" && fromCustomer.length > 0) return fromCustomer;

  return null;
}

function extractEventId(payload: WebhookPayload): string {
  const data = payload.data as Record<string, unknown>;
  const ts = payload.timestamp instanceof Date ? payload.timestamp.toISOString() : String(payload.timestamp);
  const primaryId =
    (typeof data.subscription_id === "string" && data.subscription_id) ||
    (typeof data.payment_id === "string" && data.payment_id) ||
    (typeof data.refund_id === "string" && data.refund_id) ||
    (typeof data.dispute_id === "string" && data.dispute_id) ||
    (typeof data.id === "string" && data.id) ||
    "unknown";

  return `${payload.type}:${primaryId}:${ts}`;
}

function mapStatus(type: string): InternalBillingStatus | null {
  if (
    type === "subscription.active" ||
    type === "subscription.renewed" ||
    type === "subscription.plan_changed"
  ) {
    return "active";
  }
  if (type === "subscription.on_hold" || type === "subscription.failed") {
    return "past_due";
  }
  if (type === "subscription.cancelled") {
    return "canceled";
  }
  if (type === "subscription.expired") {
    return "expired";
  }
  return null;
}

export async function hasActiveEntitlement(userId: string): Promise<boolean> {
  const db = requireSupabaseAdmin();
  const { data, error } = await db
    .from("profiles")
    .select("subscription_active,billing_status,access_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return isEntitlementActive((data as EntitlementStatusShape | null) ?? null);
}

export function isEntitlementActive(row: EntitlementStatusShape | null): boolean {
  if (!row) return false;
  if (!row.subscription_active || row.billing_status !== "active") return false;
  if (!row.access_expires_at) return true;

  const expiresAt = new Date(row.access_expires_at);
  return expiresAt.getTime() > Date.now();
}

export async function getFreeMessageUsage(userId: string): Promise<{
  limit: number;
  used: number;
  remaining: number;
  reached: boolean;
}> {
  const db = requireSupabaseAdmin();

  const { data: threads, error: threadsError } = await db
    .from("gita_threads")
    .select("id")
    .eq("user_id", userId);

  if (threadsError) {
    throw threadsError;
  }

  const threadIds = (threads ?? [])
    .map((thread) => thread.id as string)
    .filter(Boolean);

  if (threadIds.length === 0) {
    return {
      limit: FREE_MESSAGE_LIMIT,
      used: 0,
      remaining: FREE_MESSAGE_LIMIT,
      reached: false,
    };
  }

  const { count, error: countError } = await db
    .from("gita_messages")
    .select("id", { count: "exact", head: true })
    .in("thread_id", threadIds)
    .eq("content->>role", "user");

  if (countError) {
    throw countError;
  }

  const used = count ?? 0;
  const remaining = Math.max(0, FREE_MESSAGE_LIMIT - used);

  return {
    limit: FREE_MESSAGE_LIMIT,
    used,
    remaining,
    reached: used >= FREE_MESSAGE_LIMIT,
  };
}

export async function getEntitlementRow(userId: string): Promise<BillingSubscriptionRow | null> {
  const db = requireSupabaseAdmin();
  const { data, error } = await db
    .from("profiles")
    .select(
      "user_id,subscription_active,provider_customer_id,provider_subscription_id,plan_code,billing_status,access_expires_at,has_seen_paid_welcome,updated_at"
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as BillingSubscriptionRow | null) ?? null;
}

export async function upsertEntitlementFromWebhook(payload: WebhookPayload): Promise<void> {
  const nextStatus = mapStatus(payload.type);
  if (!nextStatus) return;

  const userId = extractUserId(payload);
  if (!userId) {
    console.warn("[billing] webhook missing app_user_id metadata", { type: payload.type });
    return;
  }

  const db = requireSupabaseAdmin();
  const eventId = extractEventId(payload);
  const data = payload.data as Record<string, unknown>;
  const customer = (data.customer ?? null) as Record<string, unknown> | null;
  const planCodeRaw = dataMetadataPlanCode(data, customer);
  const planCode = planCodeRaw === "PRO" ? planCodeRaw : null;
  const currentPeriodEnd = toIsoOrNull(data.next_billing_date);
  const accessExpiresAt =
    nextStatus === "active" ? currentPeriodEnd : nextStatus === "canceled" || nextStatus === "expired" ? currentPeriodEnd : null;
  const nowIso = new Date().toISOString();
  const subscriptionActive =
    nextStatus === "active" &&
    (!accessExpiresAt || new Date(accessExpiresAt).getTime() > Date.now());

  const { error: eventInsertError } = await db.from("billing_webhook_events").insert({
    provider: "dodopayments",
    event_id: eventId,
    event_type: payload.type,
    payload,
  });

  if (eventInsertError) {
    if (eventInsertError.code === "23505") {
      return;
    }
    throw eventInsertError;
  }

  const { data: existingProfile } = await db
    .from("profiles")
    .select("has_seen_paid_welcome")
    .eq("user_id", userId)
    .maybeSingle();

  const { error: subscriptionError } = await db.from("profiles").upsert(
    {
      user_id: userId,
      subscription_active: subscriptionActive,
      provider_customer_id: typeof customer?.customer_id === "string" ? customer.customer_id : null,
      provider_subscription_id: typeof data.subscription_id === "string" ? data.subscription_id : null,
      plan_code: planCode,
      billing_status: nextStatus,
      access_expires_at: accessExpiresAt,
      has_seen_paid_welcome: existingProfile?.has_seen_paid_welcome ?? false,
      updated_at: nowIso,
    },
    {
      onConflict: "user_id",
    }
  );

  if (subscriptionError) {
    throw subscriptionError;
  }
}

export async function markPaidWelcomeSeen(userId: string): Promise<void> {
  const db = requireSupabaseAdmin();
  const { error } = await db
    .from("profiles")
    .upsert(
      {
        user_id: userId,
        has_seen_paid_welcome: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

function dataMetadataPlanCode(
  data: Record<string, unknown>,
  customer: Record<string, unknown> | null
): string | null {
  const metadata = (data.metadata ?? null) as Record<string, unknown> | null;
  const customerMetadata = (customer?.metadata ?? null) as Record<string, unknown> | null;

  const fromData = metadata?.plan_code;
  if (typeof fromData === "string" && fromData.length > 0) return fromData;

  const fromCustomer = customerMetadata?.plan_code;
  if (typeof fromCustomer === "string" && fromCustomer.length > 0) return fromCustomer;

  return null;
}
