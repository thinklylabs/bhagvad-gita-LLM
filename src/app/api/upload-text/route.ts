import { NextResponse } from "next/server";
import { processRawText } from "@/lib/processRaw";

export const runtime = "nodejs";

const MAX_TEXT_CHARS_PER_REQUEST = 120_000;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = typeof body.text === "string" ? body.text : "";
    const sourceName =
      typeof body.sourceName === "string" && body.sourceName.trim().length > 0
        ? body.sourceName.trim()
        : "uploaded-text";
    const segmentIndex =
      typeof body.segmentIndex === "number" ? body.segmentIndex : undefined;
    const segmentTotal =
      typeof body.segmentTotal === "number" ? body.segmentTotal : undefined;

    if (text.trim().length < 50) {
      return NextResponse.json({ error: "Text is too short or missing" }, { status: 400 });
    }

    if (text.length > MAX_TEXT_CHARS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: `Text too large for one request. Max ${MAX_TEXT_CHARS_PER_REQUEST.toLocaleString()} chars.`,
        },
        { status: 413 }
      );
    }

    const { chunksProcessed } = await processRawText({
      text,
      sourceName,
      segmentIndex,
      segmentTotal,
    });

    return NextResponse.json({
      success: true,
      chunksProcessed,
      message: `"${sourceName}" segment stored as ${chunksProcessed} searchable chunks`,
    });
  } catch (err) {
    console.error("[embed] Error:", err);
    return NextResponse.json(
      { error: "Internal server error", details: String(err) },
      { status: 500 }
    );
  }
}

