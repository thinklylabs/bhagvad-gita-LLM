import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { requireSupabaseAdmin } from "@/lib/supabase";

export type RagMatch = {
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

type MatchRow = {
  content: string;
  metadata: Record<string, unknown> | null;
  similarity: number;
};

export async function searchGitaContext(
  query: string,
  options?: { matchCount?: number; matchThreshold?: number }
): Promise<RagMatch[]> {
  const matchCount = options?.matchCount ?? 5;
  const matchThreshold = options?.matchThreshold ?? 0.45;

  const { embedding } = await embed({
    model: openai.embedding("text-embedding-3-small"),
    value: query,
  });

  const supabaseAdmin = requireSupabaseAdmin();
  const { data, error } = await supabaseAdmin.rpc("match_gita_embeddings", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  });

  if (error) {
    throw new Error(`RAG lookup failed: ${error.message}`);
  }

  return ((data ?? []) as MatchRow[]).map((row) => ({
    content: row.content,
    metadata: row.metadata,
    similarity: row.similarity,
  }));
}

export function formatRagContext(matches: RagMatch[]): string {
  if (matches.length === 0) return "No direct source passages found.";

  return matches
    .map((m, index) => {
      const source = String(m.metadata?.source ?? "unknown-source");
      const score = Number.isFinite(m.similarity) ? m.similarity.toFixed(3) : "n/a";
      return `[${index + 1}] source=${source} similarity=${score}\n${m.content}`;
    })
    .join("\n\n");
}

