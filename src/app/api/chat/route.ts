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

## CRITICAL RULES - YOU MUST FOLLOW THESE:

1. **THE GITA ALWAYS HAS WISDOM** - The Bhagavad Gita addresses every human experience through its teachings on *dharma*, *karma*, *detachment*, *perseverance*, *self-knowledge*, and more. Even if the user's question seems specific (like coding, work, relationships), the Gita's universal principles apply.

2. **UNDERSTAND THE EMOTIONAL DEPTH** - When users express frustration, confusion, or challenges, recognize the underlying emotional/psychological themes and connect them to Gita teachings:
   - Frustration/giving up → perseverance, detachment from results, *nishkama karma*
   - Feeling stuck → duty and action, *karma yoga*, resilience
   - Confusion/uncertainty → self-knowledge, wisdom, clarity of purpose
   - Work/career struggles → *dharma*, action without attachment, *karma yoga*
   - Relationship issues → non-attachment, compassion, duty

3. **YOU MUST ALWAYS REFERENCE THE RETRIEVED CONTEXT** - Every answer MUST cite specific passages from the retrieved context. If context is insufficient, use \`search_gita_context\` with related concepts (e.g., if user asks about coding frustration, search for "perseverance", "detachment from results", "overcoming obstacles").

4. **Every answer must include**:
   - Recognition of the user's emotional state or underlying concern
   - At least one direct quote or reference from the retrieved passages
   - The source reference (e.g., "Bhagavad Gita 2.48" or the source from metadata)
   - Clear connection showing how the Gita's wisdom applies to their situation

## How to Answer

1. **Always start by checking the retrieved context** - Use the passages provided in the "Retrieved Context" section. If they're insufficient, call \`search_gita_context\` immediately.

2. **Quote shlokas (verses) directly** - Format them like this:
   
   > *"yogasthah kuru karmani sangam tyaktva dhananjaya"*
   > - **Bhagavad Gita 2.48**
   
   Always include the verse reference from the retrieved context.

3. **Structure answers**:
   - Brief direct answer referencing the Gita
   - Supporting explanation with quotes from retrieved passages
   - Verse(s) as blockquotes with source
   - Practical takeaway grounded in the text

4. **Use markdown formatting**:
   - **Bold** for key terms
   - *Italics* for Sanskrit terms (e.g., *dharma*, *karma*)
   - Blockquotes for verse quotations
   - Headers for organizing longer responses

5. **The Gita applies to everything**: Even if a topic is modern, map it to universal principles (duty, action, detachment, perseverance, self-knowledge) and answer through those principles.

6. **Sanskrit terms**: Explain in parentheses on first use, e.g., *nishkama karma* (selfless action without attachment to results).

## What NOT to Do
- ❌ NEVER give answers without citing retrieved passages
- ❌ NEVER give generic spiritual advice without Gita quotes
- ❌ NEVER make up verse numbers or fake quotes
- ❌ NEVER skip using the search tool if context is insufficient
- ❌ Never use em dashes (—). Always use single dashes (-) instead.`;

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

/**
 * Simple concept mapper for fallback retrieval.
 * Keeps retrieval robust without adding extra model calls.
 */
function buildFallbackConceptQuery(userQuery: string): string {
  const lowerQuery = userQuery.toLowerCase();
  const concepts: string[] = [];

  if (lowerQuery.match(/\b(frustrat|angry|mad|annoy|upset|done|tired|exhaust)\b/)) {
    concepts.push("perseverance", "equanimity", "detachment from results", "overcoming obstacles");
  }
  if (lowerQuery.match(/\b(fail|stuck|can't|unable|impossible|hopeless|give up)\b/)) {
    concepts.push("duty and action", "resilience", "karma yoga");
  }
  if (lowerQuery.match(/\b(confus|lost|don't know|uncertain|doubt)\b/)) {
    concepts.push("self-knowledge", "wisdom", "dharma");
  }
  if (lowerQuery.match(/\b(work|job|career|code|project|task)\b/)) {
    concepts.push("nishkama karma", "action without attachment", "duty");
  }
  if (lowerQuery.match(/\b(why|purpose|meaning|point|reason)\b/)) {
    concepts.push("purpose of life", "self-realization");
  }

  concepts.push("karma yoga", "dharma", "dealing with difficulties");
  return [...new Set(concepts)].join(" ");
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
        // Primary retrieval: raw user query
        let matches = await searchGitaContext(latestQuery, {
          matchCount: 8,
          matchThreshold: 0.32,
        });

        // Fallback retrieval: mapped Gita concepts
        if (matches.length === 0) {
          const fallbackQuery = buildFallbackConceptQuery(latestQuery);
          matches = await searchGitaContext(fallbackQuery, {
            matchCount: 8,
            matchThreshold: 0.3,
          });
        }

        initialContext =
          matches.length > 0
            ? formatRagContext(matches)
            : "No passages found. Use search_gita_context with related Gita concepts before answering.";
      } catch (error) {
        console.error("[chat] initial RAG lookup failed:", error);
        initialContext =
          "Context retrieval failed. You MUST use the search_gita_context tool to find relevant passages. The Gita has wisdom for every situation - search for related concepts.";
      }
    } else {
      initialContext = "No query provided. Wait for user input, then retrieve context using search_gita_context tool before answering.";
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
**MANDATORY**: You MUST use the passages above to answer. If the context is insufficient or empty, you MUST call the \`search_gita_context\` tool before providing any answer. Never give generic answers without specific Gita references.`.trim(),
      messages: await convertToModelMessages(messages),
      tools: {
        ...frontendTools((clientTools ?? {}) as Record<string, { description?: string; parameters: z.ZodObject<any> }>),
        search_gita_context: tool({
          description:
            "Search the Bhagavad Gita knowledge base for relevant passages, verses, and shlokas. Use this when you need more context. IMPORTANT: If the user's question seems specific (like coding, work, etc.), search for related Gita concepts like 'perseverance', 'detachment from results', 'duty and action', 'overcoming obstacles', 'karma yoga', etc. The Gita addresses all human experiences through universal principles.",
          inputSchema: z.object({
            query: z
              .string()
              .describe("The search query - use Gita concepts (perseverance, detachment, duty, karma, dharma, etc.) even if the user's question is about modern topics. Map their situation to universal Gita teachings."),
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
                matchThreshold: 0.35, // Lower threshold for better recall
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
