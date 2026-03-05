"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AssistantRuntimeProvider,
  unstable_useRemoteThreadListRuntime,
} from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { AppShell } from "@/components/assistant-ui/chat-shell";
import { SupabaseThreadListAdapter } from "@/lib/thread-adapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type BillingStatusResponse = {
  hasAccess?: boolean;
  subscription?: {
    billing_status?: string;
    plan_code?: string | null;
    access_expires_at?: string | null;
  } | null;
};

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

function SettingsContent({ session }: { session: Session }) {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [billing, setBilling] = useState<BillingStatusResponse | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const hasActiveSubscription = billing?.hasAccess === true;

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const authHeader = {
        Authorization: `Bearer ${session.access_token}`,
      };
      try {
        const billingRes = await fetch("/api/billing/status", { headers: authHeader });

        if (billingRes.ok) {
          const payload = (await billingRes.json()) as BillingStatusResponse;
          if (isMounted) setBilling(payload);
        }
      } finally {
        if (isMounted) setLoading(false);
      }

      try {
        const paymentsRes = await fetch("/api/billing/payments", { headers: authHeader });
        if (paymentsRes.ok) {
          const payload = (await paymentsRes.json()) as {
            payments?: PaymentHistoryItem[];
          };
          if (isMounted) setPayments(payload.payments ?? []);
        }
      } finally {
        if (isMounted) setPaymentsLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [session.access_token, supabase]);

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      setChangingPassword(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated");
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const cancelSubscription = async () => {
    if (!session) return;
    try {
      setCancellingSubscription(true);
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to cancel subscription");
      }

      toast.success(
        payload.message ??
          "Subscription cancellation has been scheduled successfully."
      );

      const billingRes = await fetch("/api/billing/status", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (billingRes.ok) {
        const billingPayload = (await billingRes.json()) as BillingStatusResponse;
        setBilling(billingPayload);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel");
    } finally {
      setCancellingSubscription(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        Loading...
      </main>
    );
  }

  return (
    <AppShell
      session={session}
      headerContent={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Settings</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
    >
      <div className="h-full overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_55%)]" />
        <div className="relative mx-auto w-full max-w-5xl px-4 py-8">
          <h1 className="mb-6 text-3xl font-semibold tracking-tight text-stone-100">Settings</h1>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-stone-800 bg-stone-900/80 text-stone-100">
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription className="text-stone-400">
                  Basic account information.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-stone-300">
                <div>Email: {session.user.email}</div>
                <div>Name: {session.user.user_metadata?.full_name ?? "Not set"}</div>
              </CardContent>
            </Card>

            <Card className="border-stone-800 bg-stone-900/80 text-stone-100">
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription className="text-stone-400">
                  Update your login password.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    className="border-stone-700 bg-stone-950"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <Button
                  className="w-full bg-amber-600 text-white hover:bg-amber-500"
                  onClick={() => void changePassword()}
                  disabled={changingPassword}
                >
                  {changingPassword ? "Updating..." : "Change password"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4 border-stone-800 bg-stone-900/80 text-stone-100">
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription className="text-stone-400">
                Manage your plan, including cancellation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-stone-300">
              <div>Status: {billing?.subscription?.billing_status ?? "inactive"}</div>
              <div>Plan: {billing?.subscription?.plan_code ?? "None"}</div>
              <div>
                Expires at:{" "}
                {billing?.subscription?.access_expires_at
                  ? new Date(billing.subscription.access_expires_at).toLocaleString()
                  : "N/A"}
              </div>
              <Button
                variant="outline"
                className="border-stone-700 bg-stone-950 text-stone-200 hover:bg-stone-800"
                onClick={() => {
                  if (hasActiveSubscription) {
                    void cancelSubscription();
                    return;
                  }
                  router.push("/pricing");
                }}
                disabled={hasActiveSubscription && cancellingSubscription}
              >
                {hasActiveSubscription
                  ? cancellingSubscription
                    ? "Cancelling..."
                    : "Cancel subscription"
                  : "Upgrade"}
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-4 border-stone-800 bg-stone-900/80 text-stone-100">
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription className="text-stone-400">
                Recent payment events from your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-sm text-stone-400">
                  {paymentsLoading ? "Loading payment history..." : "No payment records yet."}
                </div>
              ) : (
                <div className="space-y-2">
                  {payments.slice(0, 20).map((p) => (
                    <div
                      key={p.eventId}
                      className="rounded-lg border border-stone-800 bg-stone-950/70 p-3 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-stone-200">
                          {p.amountDisplay}
                        </span>
                        <span className="text-stone-400">{p.status}</span>
                      </div>
                      <div className="mt-1 text-xs text-stone-500">
                        {new Date(p.createdAt).toLocaleString()} · {p.paymentId}
                      </div>
                      <div className="mt-1 text-xs text-stone-500">
                        Method: {p.paymentMethod ?? "N/A"}
                      </div>
                      {p.invoiceUrl ? (
                        <a
                          href={p.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-xs text-amber-400 hover:text-amber-300"
                        >
                          View invoice
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function AuthenticatedSettings({ session }: { session: Session }) {
  const adapter = useMemo(
    () => new SupabaseThreadListAdapter(session.access_token),
    [session.access_token]
  );
  const runtime = unstable_useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function RuntimeHook() {
      return useChatRuntime({
        transport: new AssistantChatTransport({
          api: "/api/chat",
          headers: async () => ({
            Authorization: `Bearer ${session.access_token}`,
          }),
        }),
      });
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SettingsContent session={session} />
    </AssistantRuntimeProvider>
  );
}

export default function SettingsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        Loading...
      </main>
    );
  }

  if (!session) return null;
  return <AuthenticatedSettings session={session} />;
}
