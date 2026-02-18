"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "loading" | "success" | "error";
const SEGMENT_SIZE = 100_000;

function splitIntoSegments(text: string): string[] {
  const segments: string[] = [];
  for (let i = 0; i < text.length; i += SEGMENT_SIZE) {
    const segment = text.slice(i, i + SEGMENT_SIZE).trim();
    if (segment.length > 0) segments.push(segment);
  }
  return segments;
}

export default function UploadPage() {
  const [text, setText] = useState("");
  const [sourceName, setSourceName] = useState("Bhagavad Gita");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [chunks, setChunks] = useState<number | null>(null);
  const [progress, setProgress] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;

    setStatus("loading");
    setMessage("");
    setChunks(null);
    setProgress("");

    try {
      const segments = splitIntoSegments(text);
      let totalChunks = 0;

      for (let i = 0; i < segments.length; i++) {
        const segmentNumber = i + 1;
        setProgress(`Processing segment ${segmentNumber}/${segments.length}...`);

        const res = await fetch("/api/upload-text", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: segments[i],
            sourceName,
            segmentIndex: segmentNumber,
            segmentTotal: segments.length,
          }),
        });

        const raw = await res.text();
        let data: { error?: string; chunksProcessed?: number; message?: string } = {};
        try {
          data = JSON.parse(raw);
        } catch {
          if (!res.ok) {
            throw new Error("Server returned invalid JSON.");
          }
        }

        if (!res.ok) {
          throw new Error(data.error ?? "Something went wrong.");
        }

        totalChunks += data.chunksProcessed ?? 0;
      }

      setStatus("success");
      setChunks(totalChunks);
      setMessage(`"${sourceName}" stored as ${totalChunks} searchable chunks.`);
      setProgress("");
    } catch {
      setStatus("error");
      setMessage("Failed while embedding. Try with a smaller paste and retry.");
      setProgress("");
    }
  }

  function reset() {
    setStatus("idle");
    setText("");
    setMessage("");
    setChunks(null);
    setProgress("");
  }

  return (
    <div className="min-h-screen pt-16 flex flex-col items-center justify-start px-4 py-10">
      <div className="w-full max-w-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-200 text-sm mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to chat
        </Link>

        <h1 className="text-2xl font-semibold text-amber-100 mb-1">Add Context</h1>
        <p className="text-stone-400 text-sm mb-8">
          Paste the text you want to add to the knowledge base. It will be chunked and stored as embeddings in Supabase.
        </p>

        {status === "success" ? (
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-8 text-center">
            <p className="text-4xl mb-4">✅</p>
            <p className="text-amber-100 font-semibold text-lg">Knowledge base updated!</p>
            <p className="text-stone-400 text-sm mt-1">{message}</p>
            {chunks !== null && (
              <p className="text-stone-500 text-xs mt-1">{chunks} chunks embedded and stored in Supabase</p>
            )}
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg border border-stone-600 text-stone-300 hover:text-white hover:border-stone-400 text-sm transition-colors"
              >
                Add more text
              </button>
              <Link
                href="/"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
              >
                Go to chat →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-stone-300 text-sm font-medium mb-1">
                Source name
              </label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 focus:border-amber-600 focus:outline-none rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 transition-colors"
                placeholder="e.g. Bhagavad Gita"
              />
            </div>

            <div>
              <label className="block text-stone-300 text-sm font-medium mb-1">
                Paste text
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={18}
                className="w-full bg-stone-900 border border-stone-700 focus:border-amber-600 focus:outline-none rounded-lg px-3 py-2 text-sm text-stone-100 placeholder-stone-500 transition-colors resize-y font-mono leading-relaxed"
                placeholder="Paste the Bhagavad Gita text here..."
              />
              <p className="text-stone-500 text-xs mt-1">
                {text.length.toLocaleString()} characters
                {text.length > 0 && ` · ~${Math.ceil(text.length / 1500)} chunks`}
              </p>
            </div>

            {status === "error" && (
              <div className="bg-red-950/50 border border-red-800 rounded-lg p-3">
                <p className="text-red-400 text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!text.trim() || status === "loading"}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 disabled:cursor-not-allowed text-white font-medium transition-colors"
            >
              {status === "loading" ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Embedding…
                </>
              ) : (
                "Embed & Store"
              )}
            </button>
            {status === "loading" && (
              <p className="text-stone-400 text-xs text-center">{progress}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
