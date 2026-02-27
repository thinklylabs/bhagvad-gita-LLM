import { requireRequestSupabase, requireRequestUserId } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/threads/[id]/messages
// When ?format=... is present, returns raw MessageStorageEntry[] for withFormat().
// Otherwise returns an ExportedMessageRepository for the fallback load().
export async function GET(req: Request, { params }: Params) {
  try {
    const userId = await requireRequestUserId(req);
    const { id } = await params;
    const url = new URL(req.url);
    const format = url.searchParams.get("format");

    const db = requireRequestSupabase(req);
    const { error: threadError } = await db
      .from("gita_threads")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (threadError) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    const { data, error } = await db
      .from("gita_messages")
      .select("id, parent_id, format, content, run_config")
      .eq("thread_id", id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = data ?? [];

    if (format) {
      const filtered = rows
        .filter((r) => r.format === format)
        .map((r) => ({
          id: r.id,
          parent_id: r.parent_id ?? null,
          format: r.format,
          content: r.content,
        }));
      return NextResponse.json(filtered);
    }

    return NextResponse.json({
      messages: rows.map((row) => ({
        message: row.content,
        parentId: row.parent_id ?? null,
        runConfig: row.run_config ?? undefined,
      })),
    });
  } catch (err) {
    console.error("[messages GET]", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json([]);
  }
}

// POST /api/threads/[id]/messages
// Accepts either:
//   - withFormat() payload: { id, parent_id, format, content }
//   - fallback payload:     { message: { id, ... }, parentId, runConfig }
export async function POST(req: Request, { params }: Params) {
  try {
    const userId = await requireRequestUserId(req);
    const { id: threadId } = await params;
    const body = await req.json();

    const db = requireRequestSupabase(req);
    const { error: threadError } = await db
      .from("gita_threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single();

    if (threadError) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (body.format) {
      const { error } = await db.from("gita_messages").upsert(
        {
          id: body.id,
          thread_id: threadId,
          parent_id: body.parent_id ?? null,
          format: body.format,
          content: body.content,
        },
        { onConflict: "id" }
      );
      if (error) throw error;
    } else {
      const { error } = await db.from("gita_messages").upsert(
        {
          id: body.message.id,
          thread_id: threadId,
          parent_id: body.parentId ?? null,
          format: null,
          content: body.message,
          run_config: body.runConfig ?? null,
        },
        { onConflict: "id" }
      );
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[messages POST]", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
  }
}
