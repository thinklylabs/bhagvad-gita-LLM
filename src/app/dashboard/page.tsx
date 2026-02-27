"use client";

import { AssistantRuntimeProvider, unstable_useRemoteThreadListRuntime } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useChatRuntime,
} from "@assistant-ui/react-ai-sdk";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { ChatShell } from "@/components/assistant-ui/chat-shell";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import { SupabaseThreadListAdapter } from "@/lib/thread-adapter";
import { useEffect, useMemo, useRef, useState } from "react";

function AuthenticatedChat({ session }: { session: Session }) {
  const adapter = useMemo(() => new SupabaseThreadListAdapter(), []);

  const runtime = unstable_useRemoteThreadListRuntime({
    adapter,
    runtimeHook: function RuntimeHook() {
      return useChatRuntime({
        transport: new AssistantChatTransport({ api: "/api/chat" }),
      });
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ChatShell session={session} />
    </AssistantRuntimeProvider>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const welcomedUserIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = getBrowserSupabase();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        const prompt = new URLSearchParams(window.location.search).get("prompt");
        router.replace(
          prompt ? `/auth?prompt=${encodeURIComponent(prompt)}` : "/auth"
        );
        return;
      }
      setSession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!nextSession) {
        const prompt = new URLSearchParams(window.location.search).get("prompt");
        router.replace(
          prompt ? `/auth?prompt=${encodeURIComponent(prompt)}` : "/auth"
        );
        return;
      }
      setSession(nextSession);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!session) return;
    if (welcomedUserIds.current.has(session.user.id)) return;

    const shouldShowWelcome =
      session.user.user_metadata?.show_welcome_toast === true;
    if (!shouldShowWelcome) return;

    welcomedUserIds.current.add(session.user.id);
    toast.success(`Welcome to Gita AI, ${session.user.user_metadata?.first_name ?? "friend"}!`);

    const supabase = getBrowserSupabase();
    void supabase.auth.updateUser({
      data: {
        ...session.user.user_metadata,
        show_welcome_toast: false,
      },
    });
  }, [session]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 text-stone-400">
        Loading...
      </div>
    );
  }

  if (!session) return null;

  return <AuthenticatedChat session={session} />;
}
