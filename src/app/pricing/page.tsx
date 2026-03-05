"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SiteFooter, SiteNavbar } from "@/components/site/chrome";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function PricingPage() {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(!!data.session);
    });
  }, [supabase]);

  const startCheckout = async () => {
    try {
      setLoadingCheckout(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        router.push("/auth");
        return;
      }

      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planCode: "PRO" }),
      });

      const payload = (await response.json()) as {
        checkoutUrl?: string;
        error?: string;
      };

      if (!response.ok || !payload.checkoutUrl) {
        throw new Error(payload.error ?? "Failed to initialize checkout");
      }

      window.location.href = payload.checkoutUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Checkout failed";
      toast.error(message);
    } finally {
      setLoadingCheckout(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.10),transparent_55%)]" />
      <div className="relative z-10">
        <SiteNavbar />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-5xl flex-col items-center justify-center px-4 py-16">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-stone-100 sm:text-5xl">
            Clear, Honest Pricing
          </h1>
          <p className="mt-3 text-sm text-stone-400 sm:text-base">
            One simple monthly plan for full access to your Gita AI workspace.
          </p>
        </div>

        <Card className="w-full max-w-md border-stone-800 bg-stone-900/70 text-stone-100 shadow-2xl shadow-black/30">
          <CardHeader>
            <CardTitle className="text-2xl">Gita AI Pro</CardTitle>
            <CardDescription className="text-stone-400">
              Built for daily reflection, difficult decisions, and grounded guidance from the Bhagavad Gita.
            </CardDescription>
            <div className="pt-2">
              <span className="text-4xl font-bold text-amber-400">$2.99</span>
              <span className="ml-2 text-stone-400">per month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-stone-300">
              <Check className="h-4 w-4 text-amber-500" />
              Unlimited conversations with persistent history
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-300">
              <Check className="h-4 w-4 text-amber-500" />
              Account sync across sessions and devices
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-300">
              <Check className="h-4 w-4 text-amber-500" />
              Faster response queue with priority processing
            </div>
            <div className="flex items-center gap-2 text-sm text-stone-300">
              <Check className="h-4 w-4 text-amber-500" />
              Cancel anytime with no long-term lock-in
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              className="w-full bg-amber-600 text-white hover:bg-amber-500"
              onClick={() => void startCheckout()}
              disabled={loadingCheckout}
            >
              {loadingCheckout
                ? "Redirecting..."
                : isLoggedIn
                  ? "Subscribe for $2.99/month"
                  : "Sign up to subscribe"}
            </Button>
            <p className="text-center text-xs text-stone-500">
              Secure checkout. Cancel anytime.
            </p>
          </CardFooter>
        </Card>
      </div>
      <div className="relative z-10">
        <SiteFooter />
      </div>
    </main>
  );
}
