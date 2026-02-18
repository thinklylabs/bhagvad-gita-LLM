export type Chunk = {
  content: string;
  metadata: {
    chunk_index: number;
    char_start: number;
    char_end: number;
    source: string;
    segment_index?: number;
    segment_total?: number;
  };
};

type ChunkOptions = {
  chunkSize?: number;
  chunkOverlap?: number;
  source: string;
  segmentIndex?: number;
  segmentTotal?: number;
};

export function chunkText(rawText: string, options: ChunkOptions): Chunk[] {
  const chunkSize = options.chunkSize ?? 2000;
  const chunkOverlap = options.chunkOverlap ?? 200;
  const step = Math.max(1, chunkSize - chunkOverlap);

  const text = rawText.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  const chunks: Chunk[] = [];

  let chunkIndex = 0;
  for (let start = 0; start < text.length; start += step) {
    const end = Math.min(start + chunkSize, text.length);
    const content = text.slice(start, end).trim();
    if (content.length < 40) continue;

    chunks.push({
      content,
      metadata: {
        chunk_index: chunkIndex++,
        char_start: start,
        char_end: end,
        source: options.source,
        segment_index: options.segmentIndex,
        segment_total: options.segmentTotal,
      },
    });
  }

  return chunks;
}

