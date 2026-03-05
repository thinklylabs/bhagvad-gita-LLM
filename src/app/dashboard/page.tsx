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
import { useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";

function AuthenticatedChat({ session }: { session: Session }) {
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
      <ChatShell session={session} />
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
      };
      setHasAccess(payload.hasAccess === true);
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
      {hasAccess ? (
        <AuthenticatedChat session={session} />
      ) : (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-950 px-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_60%)]" />

          <div className="relative w-full max-w-sm">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-base shadow-lg shadow-amber-900/30">
                🕉
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-stone-100">
                Unlock Gita AI Pro
              </h1>
              <p className="mt-1.5 text-sm text-stone-400">
                One plan, full access, regional pricing.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/80 shadow-2xl shadow-black/40 backdrop-blur-sm">

              <div className="flex border-b border-stone-800">
                {plans.map((plan) => (
                  <button
                    key={plan.code}
                    onClick={() => setSelectedPlan(plan.code)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      selectedPlan === plan.code
                        ? "bg-stone-800 text-stone-100"
                        : "text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {plan.region}
                  </button>
                ))}
              </div>

              {(() => {
                const plan = plans.find((p) => p.code === selectedPlan)!;
                return (
                  <div className="p-6">
                    <div className="mb-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-bold text-amber-400">{plan.amount}</span>
                        <span className="text-sm text-stone-400">{plan.period}</span>
                      </div>
                    </div>

                    <ul className="mb-6 space-y-2.5">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-stone-300">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Button
                      className="w-full bg-amber-600 py-5 text-sm font-medium text-white shadow-md shadow-amber-900/30 hover:bg-amber-500"
                      onClick={() => void startCheckout(plan.code)}
                      disabled={checkoutLoading !== null}
                    >
                      {checkoutLoading === plan.code ? "Redirecting..." : plan.cta}
                    </Button>

                    <p className="mt-3 text-center text-xs text-stone-500">
                      Secure checkout · Cancel anytime
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => router.push("/")}
                className="text-xs text-stone-500 transition-colors hover:text-stone-300"
              >
                Back to home
              </button>
            </div>
          </div>
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
