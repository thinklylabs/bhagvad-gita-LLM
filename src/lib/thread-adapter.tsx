"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAui } from "@assistant-ui/store";
import {
  RuntimeAdapterProvider,
  type ThreadHistoryAdapter,
  type ExportedMessageRepository,
  type ExportedMessageRepositoryItem,
  type unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
} from "@assistant-ui/react";
import type { ThreadMessage } from "@assistant-ui/react";
import { createAssistantStream, type AssistantStream } from "assistant-stream";
import { getBrowserSupabase } from "@/lib/supabase-browser";
import type { ComponentType, PropsWithChildren } from "react";

// ─── Types matching assistant-ui's MessageFormatAdapter contract ──────────────

type MessageStorageEntry<T> = {
  id: string;
  parent_id: string | null;
  format: string;
  content: T;
};

type MessageFormatItem<T> = { parentId: string | null; message: T };
type MessageFormatRepository<T> = {
  headId?: string | null;
  messages: MessageFormatItem<T>[];
};

type MessageFormatAdapter<TMessage, TStorage> = {
  format: string;
  encode(item: MessageFormatItem<TMessage>): TStorage;
  decode(stored: MessageStorageEntry<TStorage>): MessageFormatItem<TMessage>;
  getId(message: TMessage): string;
};

type GenericThreadHistoryAdapter<T> = {
  load(): Promise<MessageFormatRepository<T>>;
  append(item: MessageFormatItem<T>): Promise<void>;
};

// ─── ThreadHistoryAdapter backed by Supabase ─────────────────────────────────

class SupabaseThreadHistoryAdapterImpl implements ThreadHistoryAdapter {
  constructor(private aui: ReturnType<typeof useAui>) {}

  private async authedFetch(input: string, init?: RequestInit) {
    const supabase = getBrowserSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("Session expired. Please sign in again.");
      throw new Error("Not authenticated");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    headers.set("Content-Type", "application/json");

    return fetch(input, { ...init, headers });
  }

  private getRemoteId(): string | undefined {
    return this.aui.threadListItem().getState().remoteId;
  }

  async load(): Promise<ExportedMessageRepository> {
    const remoteId = this.getRemoteId();
    if (!remoteId) return { messages: [] };
    try {
      const res = await this.authedFetch(`/api/threads/${remoteId}/messages`, {
        method: "GET",
      });
      if (!res.ok) return { messages: [] };
      return (await res.json()) as ExportedMessageRepository;
    } catch {
      return { messages: [] };
    }
  }

  async append(item: ExportedMessageRepositoryItem): Promise<void> {
    const { remoteId } = await this.aui.threadListItem().initialize();
    await this.authedFetch(`/api/threads/${remoteId}/messages`, {
      method: "POST",
      body: JSON.stringify(item),
    });
  }

  withFormat<TMessage, TStorage>(
    formatAdapter: MessageFormatAdapter<TMessage, TStorage>
  ): GenericThreadHistoryAdapter<TMessage> {
    const adapter = this;
    return {
      async load(): Promise<MessageFormatRepository<TMessage>> {
        const remoteId = adapter.getRemoteId();
        if (!remoteId) return { messages: [] };
        try {
          const res = await adapter.authedFetch(
            `/api/threads/${remoteId}/messages?format=${formatAdapter.format}`
          );
          if (!res.ok) return { messages: [] };
          const rows: MessageStorageEntry<TStorage>[] = await res.json();
          return {
            messages: rows.map((row) => formatAdapter.decode(row)),
          };
        } catch {
          return { messages: [] };
        }
      },
      async append(item: MessageFormatItem<TMessage>): Promise<void> {
        const { remoteId } = await adapter.aui.threadListItem().initialize();
        const messageId = formatAdapter.getId(item.message);
        const encoded = formatAdapter.encode(item);
        await adapter.authedFetch(`/api/threads/${remoteId}/messages`, {
          method: "POST",
          body: JSON.stringify({
            id: messageId,
            parent_id: item.parentId,
            format: formatAdapter.format,
            content: encoded,
          }),
        });
      },
    };
  }
}

function useSupabaseThreadHistoryAdapter(): ThreadHistoryAdapter {
  const aui = useAui();
  const [adapter] = useState(() => new SupabaseThreadHistoryAdapterImpl(aui));
  return adapter;
}

// ─── unstable_Provider ────────────────────────────────────────────────────────

function SupabaseAdapterProvider({ children }: PropsWithChildren) {
  const history = useSupabaseThreadHistoryAdapter();
  return (
    <RuntimeAdapterProvider adapters={{ history }}>
      {children}
    </RuntimeAdapterProvider>
  );
}

// ─── RemoteThreadListAdapter backed by Supabase ───────────────────────────────

export class SupabaseThreadListAdapter implements RemoteThreadListAdapter {
  unstable_Provider: ComponentType<PropsWithChildren> = SupabaseAdapterProvider;

  private async authedFetch(input: string, init?: RequestInit) {
    const supabase = getBrowserSupabase();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      toast.error("Session expired. Please sign in again.");
      throw new Error("Not authenticated");
    }

    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    headers.set("Content-Type", "application/json");

    return fetch(input, { ...init, headers });
  }

  async list() {
    try {
      const res = await this.authedFetch("/api/threads", { method: "GET" });
      if (!res.ok) return { threads: [] };
      return (await res.json()) as Awaited<ReturnType<RemoteThreadListAdapter["list"]>>;
    } catch {
      return { threads: [] };
    }
  }

  async initialize(threadId: string) {
    const res = await this.authedFetch("/api/threads", {
      method: "POST",
      body: JSON.stringify({ threadId }),
    });
    if (!res.ok) throw new Error("Failed to create thread");
    return (await res.json()) as { remoteId: string; externalId: string | undefined };
  }

  async rename(remoteId: string, newTitle: string) {
    await this.authedFetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ title: newTitle }),
    });
  }

  async archive(remoteId: string) {
    await this.authedFetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    });
  }

  async unarchive(remoteId: string) {
    await this.authedFetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "regular" }),
    });
  }

  async delete(remoteId: string) {
    await this.authedFetch(`/api/threads/${remoteId}`, { method: "DELETE" });
  }

  async fetch(remoteId: string) {
    const res = await this.authedFetch(`/api/threads/${remoteId}`, { method: "GET" });
    if (!res.ok) throw new Error("Thread not found");
    return (await res.json()) as Awaited<ReturnType<RemoteThreadListAdapter["fetch"]>>;
  }

  async generateTitle(
    remoteId: string,
    messages: readonly ThreadMessage[]
  ): Promise<AssistantStream> {
    const firstUser = messages.find((m) => m.role === "user");
    const titleText =
      firstUser?.content
        .filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join("") ?? "New conversation";

    const title = titleText.replace(/\s+/g, " ").trim().slice(0, 55);

    this.authedFetch(`/api/threads/${remoteId}`, {
      method: "PATCH",
      body: JSON.stringify({ title }),
    }).catch(() => {});

    return createAssistantStream((controller) => {
      controller.appendText(title);
      controller.close();
    });
  }
}
