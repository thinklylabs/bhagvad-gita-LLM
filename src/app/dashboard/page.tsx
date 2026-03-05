"use client";

import { AssistantRuntimeProvider, unstable_useRemoteThreadListRuntime } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { ChatShell } from "@/components/assistant-ui/chat-shell";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { SupabaseThreadListAdapter } from "@/lib/thread-adapter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";

function AuthenticatedChat({
  session,
  composerLocked,
  showUpgrade,
  onUpgradeClick,
}: {
  session: Session;
  composerLocked: boolean;
  showUpgrade: boolean;
  onUpgradeClick: () => void;
}) {
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
      <ChatShell
        session={session}
        composerLocked={composerLocked}
        showUpgrade={showUpgrade}
        onUpgradeClick={onUpgradeClick}
      />
    </AssistantRuntimeProvider>
  );
}

const plans = [
  { code: "WORLD", region: "World", amount: "$5", period: "per month", cta: "Subscribe for $5/month" },
  { code: "IN", region: "India", amount: "₹279", period: "per month", cta: "Subscribe for ₹279/month" },
] as const;

const features = [
  "Unlimited conversations with persistent history",
  "Account sync across sessions and devices",
  "Priority response processing",
  "Cancel anytime, no lock-in",
];

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [trialLimitReached, setTrialLimitReached] = useState(false);
  const [freeMessagesRemaining, setFreeMessagesRemaining] = useState(3);
  const [trialPaywallDismissed, setTrialPaywallDismissed] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [showPaidWelcome, setShowPaidWelcome] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<"WORLD" | "IN" | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"WORLD" | "IN">("WORLD");
  const lastBillingCheckedTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    const checkBillingAccess = async (nextSession: Session) => {
      if (lastBillingCheckedTokenRef.current === nextSession.access_token) {
        setSession(nextSession);
        setLoading(false);
        return;
      }
      const res = await fetch("/api/billing/status", {
        headers: {
          Authorization: `Bearer ${nextSession.access_token}`,
        },
      });

      if (!res.ok) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      const payload = (await res.json()) as {
        hasAccess?: boolean;
        showPaidWelcomePopup?: boolean;
        trialLimitReached?: boolean;
        freeMessagesRemaining?: number;
      };
      const access = payload.hasAccess === true;
      const limitReached = payload.trialLimitReached === true;
      const remaining = Number.isFinite(payload.freeMessagesRemaining)
        ? Math.max(0, Number(payload.freeMessagesRemaining))
        : 0;
      setHasAccess(access);
      setTrialLimitReached(limitReached);
      setFreeMessagesRemaining(remaining);
      setShowPaidWelcome(payload.showPaidWelcomePopup === true);
      lastBillingCheckedTokenRef.current = nextSession.access_token;
      setSession(nextSession);
      setLoading(false);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        const prompt = new URLSearchParams(window.location.search).get("prompt");
        router.replace(
          prompt ? `/auth?prompt=${encodeURIComponent(prompt)}` : "/auth"
        );
        return;
      }
      await checkBillingAccess(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!nextSession) {
        const prompt = new URLSearchParams(window.location.search).get("prompt");
        router.replace(
          prompt ? `/auth?prompt=${encodeURIComponent(prompt)}` : "/auth"
        );
        return;
      }
      await checkBillingAccess(nextSession);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!session || hasAccess) return;

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch("/api/billing/status", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });
        if (!res.ok) return;
        const payload = (await res.json()) as {
          hasAccess?: boolean;
          trialLimitReached?: boolean;
          freeMessagesRemaining?: number;
        };
        const access = payload.hasAccess === true;
        const limitReached = payload.trialLimitReached === true;
        const remaining = Number.isFinite(payload.freeMessagesRemaining)
          ? Math.max(0, Number(payload.freeMessagesRemaining))
          : 0;
        setHasAccess(access);
        setTrialLimitReached(limitReached);
        setFreeMessagesRemaining(remaining);
      } catch (error) {
        console.error("[dashboard] billing status refresh failed", error);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [session, hasAccess]);

  useEffect(() => {
    if (hasAccess || !trialLimitReached) {
      setTrialPaywallDismissed(false);
    }
  }, [hasAccess, trialLimitReached]);

  useEffect(() => {
    if (hasAccess) {
      setUpgradeModalOpen(false);
      setTrialPaywallDismissed(false);
    }
  }, [hasAccess]);

  const startCheckout = async (planCode: "WORLD" | "IN") => {
    if (!session) return;
    try {
      setCheckoutLoading(planCode);
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planCode }),
      });
      const payload = (await response.json()) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? "Failed to initialize checkout");
      }
      window.location.href = payload.checkoutUrl;
    } catch (error) {
      console.error("[dashboard] checkout start failed", error);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const closePaidWelcome = async () => {
    if (!session) {
      setShowPaidWelcome(false);
      return;
    }
    try {
      await fetch("/api/profile/welcome", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    } catch (error) {
      console.error("[dashboard] failed to acknowledge welcome", error);
    } finally {
      setShowPaidWelcome(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        Loading...
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="relative min-h-screen bg-stone-950">
      <AuthenticatedChat
        session={session}
        composerLocked={!hasAccess && trialLimitReached}
        showUpgrade={!hasAccess}
        onUpgradeClick={() => {
          setTrialPaywallDismissed(false);
          setUpgradeModalOpen(true);
        }}
      />

      {!hasAccess && !trialLimitReached && (
        <div className="pointer-events-none fixed left-1/2 top-16 z-40 -translate-x-1/2 rounded-full border border-amber-700/50 bg-stone-900/90 px-3 py-1.5 text-xs text-amber-200 shadow-lg shadow-black/30">
          {freeMessagesRemaining} free message{freeMessagesRemaining === 1 ? "" : "s"} left
        </div>
      )}

      {!hasAccess && (upgradeModalOpen || (trialLimitReached && !trialPaywallDismissed)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/72 backdrop-blur-sm" />
          <Card className="relative w-full max-w-md border-stone-800 bg-stone-900 text-stone-100 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-stone-800 px-6 pt-6 pb-4">
              <Tabs
                value={selectedPlan}
                onValueChange={(value) => setSelectedPlan(value as "WORLD" | "IN")}
              >
                <TabsList className="grid w-full grid-cols-2 bg-stone-800/80">
                  <TabsTrigger value="WORLD">World</TabsTrigger>
                  <TabsTrigger value="IN">India</TabsTrigger>
                </TabsList>
              </Tabs>
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  if (trialLimitReached) setTrialPaywallDismissed(true);
                  setUpgradeModalOpen(false);
                }}
                className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-lg">
                  🕉
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-amber-400">
                    {plans.find((p) => p.code === selectedPlan)!.amount}
                    <span className="ml-1.5 text-base font-normal text-stone-400">
                      {plans.find((p) => p.code === selectedPlan)!.period}
                    </span>
                  </CardTitle>
                  <CardDescription className="mt-0.5 text-stone-400">
                    Free messages complete. Upgrade to send more.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2.5">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-stone-300">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    {f}
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                className="w-full bg-amber-600 py-5 text-sm font-medium text-white hover:bg-amber-500"
                onClick={() => void startCheckout(selectedPlan)}
                disabled={checkoutLoading !== null}
              >
                {checkoutLoading === selectedPlan
                  ? "Redirecting..."
                  : plans.find((p) => p.code === selectedPlan)!.cta}
              </Button>
              <p className="text-center text-xs text-stone-500">
                Secure checkout · Cancel anytime
              </p>
            </CardFooter>
          </Card>
        </div>
      )}

      {hasAccess && showPaidWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-stone-800 bg-stone-900 shadow-2xl shadow-black/50">
            <div className="h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500" />
            <div className="px-7 pb-7 pt-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-xl shadow-lg shadow-amber-900/40">
                🕉
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-stone-100">
                You are in.
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-400">
                Welcome to Gita AI Pro. Your subscription is active and your account is fully unlocked.
              </p>

              <div className="mt-5 space-y-2">
                <div className="flex items-center gap-2.5 text-sm text-stone-300">
                  <Check className="h-4 w-4 text-amber-500" />
                  Unlimited conversations
                </div>
                <div className="flex items-center gap-2.5 text-sm text-stone-300">
                  <Check className="h-4 w-4 text-amber-500" />
                  Persistent chat history
                </div>
                <div className="flex items-center gap-2.5 text-sm text-stone-300">
                  <Check className="h-4 w-4 text-amber-500" />
                  Priority response queue
                </div>
              </div>

              <Button
                className="mt-6 w-full bg-amber-600 py-5 text-sm font-medium text-white shadow-md shadow-amber-900/30 hover:bg-amber-500"
                onClick={() => void closePaidWelcome()}
              >
                Start chatting
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
