import { openai } from "@ai-sdk/openai";
import { frontendTools } from "@assistant-ui/react-ai-sdk";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { formatRagContext, searchGitaContext } from "@/lib/rag";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are **Gita AI**, a deeply knowledgeable assistant specializing in the Bhagavad Gita.

## Your Personality
- Speak with clarity and warmth, like a wise teacher who makes ancient wisdom accessible.
- Be conversational yet insightful - not robotic.
- You can give your own interpretation, but always ground it in the actual text.

## How to Answer

1. **Always use the retrieved context** to form your answers. If context is insufficient, use the \`search_gita_context\` tool to find more relevant passages.

2. **Quote shlokas (verses) directly** when:
   - The user asks about a specific topic, concept, or teaching
   - A verse is particularly relevant to the answer
   - The user explicitly asks for a verse or quote
   
   Format shlokas like this:
   
   > *"yogasthah kuru karmani sangam tyaktva dhananjaya"*
   > - **Bhagavad Gita 2.48**
   
   If the shloka is in the retrieved text, quote it exactly. If the transliteration is available, include it.

3. **Structure longer answers** with:
   - A brief direct answer first
   - Supporting explanation with context
   - Relevant verse(s) as blockquotes
   - Practical takeaway when appropriate

4. **Use markdown formatting**:
   - **Bold** for key terms and concepts
   - *Italics* for Sanskrit terms (e.g., *dharma*, *karma*, *moksha*)
   - Blockquotes for verse quotations
   - Headers for organizing longer responses
   - Lists when comparing concepts

5. **Be honest**: If the Gita doesn't address something, say so. Don't fabricate verses.

6. **Sanskrit terms**: When you use a Sanskrit term, briefly explain it in parentheses on first use, e.g., *nishkama karma* (selfless action without attachment to results).

## What NOT to Do
- Don't give generic spiritual advice without grounding it in the text
- Don't make up verse numbers or fake quotes
- Don't be preachy - be helpful and conversational
- Don't dump huge walls of text - be concise unless asked for detail
- **Never use em dashes (—). Always use single dashes (-) instead.**`;

function extractLatestUserText(messages: UIMessage[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return "";

  const msg = lastUser as unknown as {
    content?: unknown;
    parts?: Array<{ type?: string; text?: string }>;
  };

  if (typeof msg.content === "string") return msg.content;

  if (Array.isArray(msg.content)) {
    return msg.content
      .map((p) => {
        if (typeof p === "string") return p;
        if (p && typeof p === "object" && "text" in p) return String((p as { text?: unknown }).text ?? "");
        return "";
      })
      .join(" ")
      .trim();
  }

  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text ?? "")
      .join(" ")
      .trim();
  }

  return "";
}

export async function POST(req: Request) {
  try {
    const {
      messages,
      system,
      tools: clientTools,
    }: {
      messages: UIMessage[];
      system?: string;
      tools?: Record<string, unknown>;
    } = await req.json();

    // Pre-fetch context for the latest user query
    const latestQuery = extractLatestUserText(messages);
    let initialContext = "No passages retrieved yet. Use search_gita_context tool if needed.";

    if (latestQuery) {
      try {
        const matches = await searchGitaContext(latestQuery, {
          matchCount: 5,
          matchThreshold: 0.4,
        });
        if (matches.length > 0) {
          initialContext = formatRagContext(matches);
        }
      } catch (error) {
        console.error("[chat] initial RAG lookup failed:", error);
        initialContext =
          "Context retrieval is currently unavailable. Answer cautiously and avoid fabricated quotes.";
      }
    }

    const result = streamText({
      model: openai("gpt-4o-mini"),
      stopWhen: stepCountIs(6),
      system: `${system ?? ""}

${SYSTEM_PROMPT}

---
## Retrieved Context (from the Bhagavad Gita knowledge base)

${initialContext}

---
Use the passages above to answer. If you need more context on a different topic, call the \`search_gita_context\` tool.`.trim(),
      messages: await convertToModelMessages(messages),
      tools: {
        ...frontendTools((clientTools ?? {}) as Record<string, { description?: string; parameters: z.ZodObject<any> }>),
        search_gita_context: tool({
          description:
            "Search the Bhagavad Gita knowledge base for relevant passages, verses, and shlokas. Use this when you need more context beyond what was initially retrieved, or when the user asks about a specific topic not covered in the initial context.",
          inputSchema: z.object({
            query: z
              .string()
              .describe("The search query - can be a topic, concept, verse reference, or question"),
            k: z
              .number()
              .int()
              .min(1)
              .max(10)
              .default(5)
              .describe("Number of passages to retrieve"),
          }),
          execute: async ({ query, k }) => {
            let matches = [];
            try {
              matches = await searchGitaContext(query, {
                matchCount: k,
                matchThreshold: 0.38,
              });
            } catch (error) {
              console.error("[chat] tool RAG lookup failed:", error);
              return {
                passages: [],
                retrievalError:
                  "Context retrieval is temporarily unavailable. Do not fabricate quotes or verse numbers.",
              };
            }
            return {
              passages: matches.map((m, i) => ({
                ref: i + 1,
                source: String(m.metadata?.source ?? "Bhagavad Gita"),
                relevance: Number(m.similarity.toFixed(3)),
                text: m.content,
              })),
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("[chat] error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process chat request" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
