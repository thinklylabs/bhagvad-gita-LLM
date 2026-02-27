"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SiteFooter, SiteNavbar } from "@/components/site/chrome";

const plans = [
  {
    region: "World",
    code: "WORLD",
    amount: "$5",
    cta: "Subscribe for $5/month",
  },
  {
    region: "India",
    code: "IN",
    amount: "₹279",
    cta: "Subscribe for ₹279/month",
  },
] as const;

export default function PricingPage() {
  const [region, setRegion] = useState<"WORLD" | "IN">("WORLD");
  const plan = plans.find((p) => p.code === region)!;

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
            Regional monthly pricing for full access to your Gita AI workspace.
          </p>
        </div>

        <Tabs
          value={region}
          onValueChange={(value) => setRegion(value as "WORLD" | "IN")}
          className="mb-4 w-full max-w-md"
        >
          <TabsList className="grid w-full grid-cols-2 bg-stone-900/70">
            <TabsTrigger value="WORLD">World</TabsTrigger>
            <TabsTrigger value="IN">India</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="w-full max-w-md border-stone-800 bg-stone-900/70 text-stone-100 shadow-2xl shadow-black/30">
          <CardHeader>
            <div className="mb-1 inline-flex w-fit rounded-full border border-stone-700 px-2 py-0.5 text-[11px] text-stone-400">
              {plan.region}
            </div>
            <CardTitle className="text-2xl">Gita AI Pro</CardTitle>
            <CardDescription className="text-stone-400">
              Built for daily reflection, difficult decisions, and grounded guidance from the Bhagavad Gita.
            </CardDescription>
            <div className="pt-2">
              <span className="text-4xl font-bold text-amber-400">{plan.amount}</span>
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
            <Button className="w-full bg-amber-600 text-white hover:bg-amber-500">
              {plan.cta}
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
