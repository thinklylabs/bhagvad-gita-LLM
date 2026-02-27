import { requireRequestSupabase, requireRequestUserId } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

// GET /api/threads/[id] → fetch thread metadata
export async function GET(_req: Request, { params }: Params) {
  try {
    const userId = await requireRequestUserId(_req);
    const { id } = await params;
    const db = requireRequestSupabase(_req);
    const { data, error } = await db
      .from("gita_threads")
      .select("id, title, status")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) throw error;

    return NextResponse.json({
      status: data.status as "regular" | "archived",
      remoteId: data.id as string,
      title: data.title as string | undefined,
      externalId: undefined,
    });
  } catch (err) {
    console.error("[threads/[id] GET]", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
}

// PATCH /api/threads/[id] → rename or archive/unarchive
// Body: { title?: string; status?: "regular" | "archived" }
export async function PATCH(req: Request, { params }: Params) {
  try {
    const userId = await requireRequestUserId(req);
    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.title === "string") updates.title = body.title;
    if (body.status === "regular" || body.status === "archived") updates.status = body.status;

    const db = requireRequestSupabase(req);
    const { error } = await db
      .from("gita_threads")
      .update(updates)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[threads/[id] PATCH]", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update thread" }, { status: 500 });
  }
}

// DELETE /api/threads/[id] → hard delete (messages cascade)
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const userId = await requireRequestUserId(_req);
    const { id } = await params;
    const db = requireRequestSupabase(_req);
    const { error } = await db
      .from("gita_threads")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[threads/[id] DELETE]", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 });
  }
}
