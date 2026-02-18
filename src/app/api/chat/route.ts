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

1. **YOU MUST ALWAYS REFERENCE THE RETRIEVED CONTEXT** - Every answer MUST cite specific passages from the retrieved context. If no relevant context is found, you MUST use the \`search_gita_context\` tool to search for relevant passages before answering.

2. **NEVER give generic answers without Gita references** - If you cannot find relevant passages in the retrieved context, you MUST call \`search_gita_context\` tool. Generic spiritual advice without specific Gita quotes is FORBIDDEN.

3. **If no context is available after searching**, explicitly state: "I couldn't find specific passages in the Bhagavad Gita that directly address this. The knowledge base may not contain this topic yet."

4. **Every answer must include**:
   - At least one direct quote or reference from the retrieved passages
   - The source reference (e.g., "Bhagavad Gita 2.48" or the source from metadata)
   - Clear connection between the user's question and the Gita teachings

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

5. **Be honest**: If the Gita doesn't address something after searching, say so explicitly. Don't fabricate verses.

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
        console.log(`[chat] Searching for context: "${latestQuery.substring(0, 50)}..."`);
        const matches = await searchGitaContext(latestQuery, {
          matchCount: 7,
          matchThreshold: 0.35, // Lower threshold to get more matches
        });
        console.log(`[chat] Found ${matches.length} matches`);
        if (matches.length > 0) {
          initialContext = formatRagContext(matches);
          console.log(`[chat] Context formatted, length: ${initialContext.length} chars`);
        } else {
          console.warn(`[chat] No matches found for query: "${latestQuery}"`);
          initialContext = "No passages found for this query. You MUST use the search_gita_context tool to find relevant passages before answering.";
        }
      } catch (error) {
        console.error("[chat] initial RAG lookup failed:", error);
        initialContext =
          "Context retrieval failed. You MUST use the search_gita_context tool to find relevant passages. Do not answer without retrieving context from the knowledge base.";
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
