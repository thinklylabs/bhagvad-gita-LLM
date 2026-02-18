import { chunkText } from "@/lib/chunking";
import { createEmbeddings } from "@/lib/embeddings";
import { requireSupabaseAdmin } from "@/lib/supabase";

type ProcessRawInput = {
  text: string;
  sourceName: string;
  segmentIndex?: number;
  segmentTotal?: number;
};

export async function processRawText(input: ProcessRawInput): Promise<{
  chunksProcessed: number;
}> {
  const chunks = chunkText(input.text, {
    source: input.sourceName,
    segmentIndex: input.segmentIndex,
    segmentTotal: input.segmentTotal,
  });

  if (chunks.length === 0) return { chunksProcessed: 0 };

  const embeddings = await createEmbeddings(chunks.map((chunk) => chunk.content));

  const rows = chunks.map((chunk, i) => ({
    content: chunk.content,
    metadata: chunk.metadata,
    embedding: embeddings[i],
  }));

  const supabaseAdmin = requireSupabaseAdmin();
  const { error } = await supabaseAdmin.from("gita_embeddings").insert(rows);
  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }

  return { chunksProcessed: rows.length };
}

