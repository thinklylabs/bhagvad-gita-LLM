import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBED_BATCH_SIZE = 20;

export async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += EMBED_BATCH_SIZE) {
    const batch = texts.slice(i, i + EMBED_BATCH_SIZE);
    const { embeddings } = await embedMany({
      model: openai.embedding(EMBEDDING_MODEL),
      values: batch,
    });
    allEmbeddings.push(...embeddings);
  }

  return allEmbeddings;
}

