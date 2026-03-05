"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthCard } from "@/components/auth/auth-card";
import { getBrowserSupabase } from "@/lib/supabase-browser";

export default function AuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();

    const redirectAfterAuth = () => {
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;

      const params = new URLSearchParams(window.location.search);
      const prompt = params.get("prompt");
      const nextFromQuery = params.get("next");
      const nextFromStorage = window.sessionStorage.getItem("postAuthNextPath");
      const nextPath =
        (nextFromQuery?.startsWith("/") ? nextFromQuery : null) ??
        (nextFromStorage?.startsWith("/") ? nextFromStorage : null);

      if (nextFromStorage) {
        window.sessionStorage.removeItem("postAuthNextPath");
      }

      if (nextPath) {
        router.replace(nextPath);
        return;
      }

      router.replace(prompt ? `/dashboard?prompt=${encodeURIComponent(prompt)}` : "/dashboard");
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        redirectAfterAuth();
        return;
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        redirectAfterAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        Loading...
      </div>
    );
  }

  return <AuthCard />;
}
