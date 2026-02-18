"use client";

import {
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  ActionBarPrimitive,
  AuiIf,
  useMessage,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";

// ─── Markdown text component used by assistant messages ───────────────────────

function MarkdownText() {
  return (
    <MarkdownTextPrimitive
      className="aui-md"
      smooth
      components={{
        h1: ({ children }) => (
          <h1 className="text-xl font-bold mt-6 mb-3 text-amber-100">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-lg font-semibold mt-5 mb-2 text-amber-100">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-base font-semibold mt-4 mb-2 text-amber-200">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-amber-500/60 pl-4 my-3 italic text-amber-200/90">
            {children}
          </blockquote>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className={`${className ?? ""} text-[13px]`}>
                {children}
              </code>
            );
          }
          return (
            <code className="rounded bg-stone-700/60 px-1.5 py-0.5 text-[13px] text-amber-200">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-lg bg-stone-900 border border-stone-700/50 p-4 text-[13px] leading-relaxed">
            {children}
          </pre>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-amber-100">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-stone-300">{children}</em>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 underline underline-offset-2 hover:text-amber-300 transition-colors"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="my-4 border-stone-700/50" />,
        table: ({ children }) => (
          <div className="my-3 overflow-x-auto">
            <table className="w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-stone-700 bg-stone-800 px-3 py-2 text-left font-semibold text-amber-100">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-stone-700 px-3 py-2">{children}</td>
        ),
      }}
    />
  );
}

// ─── Thinking indicator ─────────────────────────────────────────────────────

function ThinkingBlock() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center gap-1.5 rounded-full bg-stone-800/80 border border-stone-700/50 px-4 py-2">
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500"
          style={{ animation: "thinking-pulse 1.4s infinite ease-in-out", animationDelay: "0s" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500"
          style={{ animation: "thinking-pulse 1.4s infinite ease-in-out", animationDelay: "0.15s" }}
        />
        <span
          className="h-1.5 w-1.5 rounded-full bg-amber-500"
          style={{ animation: "thinking-pulse 1.4s infinite ease-in-out", animationDelay: "0.3s" }}
        />
        <span className="ml-1 text-xs text-stone-400">Thinking…</span>
      </div>
    </div>
  );
}

// ─── User message ─────────────────────────────────────────────────────────────

function UserMessage() {
  return (
    <MessagePrimitive.Root className="group relative flex w-full justify-end py-2">
      <div className="max-w-[85%] sm:max-w-[75%]">
        <div className="rounded-2xl rounded-br-md bg-amber-700/90 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm">
          <MessagePrimitive.Content />
        </div>
      </div>
    </MessagePrimitive.Root>
  );
}

// ─── Assistant message ────────────────────────────────────────────────────────

function AssistantMessageBody() {
  const message = useMessage();
  // status is an object: { type: "running" | "complete" | "incomplete" | ... }
  const isRunning = message.status?.type === "running";
  const isComplete = message.status?.type === "complete";
  const hasText =
    message.content &&
    message.content.some(
      (part) => part.type === "text" && (part as { type: "text"; text: string }).text.length > 0
    );

  return (
    <div className="min-w-0 flex-1">
      {/* Thinking indicator - shown while running with no text yet */}
      {isRunning && !hasText && <ThinkingBlock />}

      {/* Actual content */}
      {hasText && (
        <div className="text-[15px] leading-relaxed text-stone-200">
          <MessagePrimitive.Content
            components={{
              Text: MarkdownText,
            }}
          />
        </div>
      )}

      {/* Action bar - only visible when message is COMPLETE, on hover */}
      {isComplete && hasText && (
        <ActionBarPrimitive.Root className="mt-1.5 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <ActionBarPrimitive.Copy asChild>
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
              Copy
            </button>
          </ActionBarPrimitive.Copy>
          <ActionBarPrimitive.Reload asChild>
            <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-stone-500 transition-colors hover:bg-stone-800 hover:text-stone-300">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path d="M1 4v6h6" />
                <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
              </svg>
              Retry
            </button>
          </ActionBarPrimitive.Reload>
        </ActionBarPrimitive.Root>
      )}
    </div>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="group relative flex w-full py-2">
      {/* Avatar */}
      <div className="mr-3 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 text-xs shadow-sm">
        🕉
      </div>

      <AssistantMessageBody />
    </MessagePrimitive.Root>
  );
}

// ─── Composer (input bar) ─────────────────────────────────────────────────────

function Composer() {
  return (
    <ComposerPrimitive.Root className="relative mx-auto flex w-full max-w-3xl items-end gap-2 rounded-2xl border border-stone-700/80 bg-stone-900 px-4 py-2 shadow-lg transition-colors focus-within:border-amber-600/60">
      <ComposerPrimitive.Input
        rows={1}
        autoFocus
        placeholder="Ask about the Bhagavad Gita…"
        className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[15px] text-stone-100 placeholder-stone-500 outline-none"
      />

      <AuiIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <button className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-700 text-stone-300 transition-colors hover:bg-stone-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          </button>
        </ComposerPrimitive.Cancel>
      </AuiIf>

      <AuiIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <button className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-500">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </ComposerPrimitive.Send>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  "What is the main teaching of the Bhagavad Gita?",
  "What does Krishna say about duty (dharma)?",
  "Explain the concept of nishkama karma",
  "What is the difference between the soul and the body?",
];

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-600/20 to-amber-800/20 text-3xl shadow-inner">
          🕉
        </div>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-amber-50">
          Gita AI
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-stone-400">
          Ask anything about the Bhagavad Gita - about life, dharma, the self,
          or the teachings of Krishna and Arjuna.
        </p>
      </div>

      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((text) => (
          <ThreadPrimitive.Suggestion
            key={text}
            prompt={text}
            send
            asChild
          >
            <button className="w-full rounded-xl border border-stone-700/60 bg-stone-900/60 px-4 py-3 text-left text-[13px] leading-snug text-stone-300 transition-all hover:border-amber-700/50 hover:bg-stone-800/80 hover:text-stone-100">
              {text}
            </button>
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}

// ─── Main thread export ───────────────────────────────────────────────────────

export function Thread() {
  return (
    <ThreadPrimitive.Root className="flex h-full flex-col">
      {/* Empty state */}
      <ThreadPrimitive.Empty>
        <EmptyState />
      </ThreadPrimitive.Empty>

      {/* Messages viewport */}
      <ThreadPrimitive.Viewport className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <ThreadPrimitive.Messages
            components={{
              UserMessage,
              AssistantMessage,
            }}
          />
        </div>
      </ThreadPrimitive.Viewport>

      {/* Input */}
      <div className="border-t border-stone-800/60 bg-stone-950 px-4 pb-4 pt-3">
        <Composer />
        <p className="mt-2 text-center text-[11px] text-stone-600">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </ThreadPrimitive.Root>
  );
}
