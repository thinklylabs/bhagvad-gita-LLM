"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        const prompt = searchParams.get("prompt");
        router.replace(
          prompt ? `/dashboard?prompt=${encodeURIComponent(prompt)}` : "/dashboard"
        );
        return;
      }
      setLoading(false);
    });
  }, [router, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        Loading...
      </div>
    );
  }

  return <AuthCard />;
}
