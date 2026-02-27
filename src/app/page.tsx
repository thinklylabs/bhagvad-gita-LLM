"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteFooter, SiteNavbar } from "@/components/site/chrome";

export default function LandingPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [showLoginPopup, setShowLoginPopup] = useState(false);

  const goToDashboard = () => {
    setShowLoginPopup(true);
  };

  const continueToDashboard = () => {
    const trimmed = prompt.trim();
    router.push(
      trimmed
        ? `/auth?prompt=${encodeURIComponent(trimmed)}`
        : "/auth"
    );
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-stone-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.10),transparent_55%)]" />
      <div className="relative z-10">
        <SiteNavbar />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-6.5rem)] w-full max-w-5xl flex-col items-center justify-center px-4">

        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 text-base shadow-md shadow-amber-900/20">
            🕉
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-stone-100 sm:text-5xl">
            Gita AI
          </h1>
        </div>

        <p className="mb-8 max-w-xl text-center text-sm leading-relaxed text-stone-400 sm:text-base">
          Ask deeply, reflect clearly. Grounded guidance from the Bhagavad Gita.
        </p>

        <div className="w-full max-w-2xl rounded-2xl border border-stone-800 bg-stone-900/70 p-2 shadow-2xl shadow-black/30 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  goToDashboard();
                }
              }}
              placeholder="Ask a question about life, dharma, purpose..."
              className="h-12 border-none bg-transparent text-base text-stone-100 placeholder:text-stone-500 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              onClick={goToDashboard}
              className="h-10 w-10 rounded-full bg-amber-600 p-0 text-white hover:bg-amber-500"
              aria-label="Go to dashboard"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <SiteFooter />
      </div>

      {showLoginPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-2xl shadow-black/40">
            <h2 className="text-lg font-semibold text-stone-100">Login to continue</h2>
            <p className="mt-2 text-sm text-stone-400">
              Create an account or sign in to start chatting with Gita AI.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                className="text-stone-300 hover:bg-stone-800 hover:text-stone-100"
                onClick={() => setShowLoginPopup(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-amber-600 text-white hover:bg-amber-500"
                onClick={continueToDashboard}
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
