import { requireRequestSupabase, requireRequestUserId } from "@/lib/auth-server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/threads → list all threads ordered newest-first
export async function GET(req: Request) {
  try {
    const userId = await requireRequestUserId(req);
    const db = requireRequestSupabase(req);
    const { data, error } = await db
      .from("gita_threads")
      .select("id, title, status, created_at, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const threads = (data ?? []).map((t) => ({
      status: t.status as "regular" | "archived",
      remoteId: t.id as string,
      title: t.title as string | undefined,
      externalId: undefined,
    }));

    return NextResponse.json({ threads });
  } catch (err) {
    console.error("[threads GET]", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to list threads" }, { status: 500 });
  }
}

// POST /api/threads → create a new thread
// Body: { threadId?: string }  — threadId is the local assistant-ui ID
export async function POST(req: Request) {
  try {
    const userId = await requireRequestUserId(req);
    const body = await req.json().catch(() => ({}));
    const externalId: string | undefined = body.threadId ?? undefined;

    const db = requireRequestSupabase(req);
    const { data, error } = await db
      .from("gita_threads")
      .insert({ status: "regular", title: null, user_id: userId })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({
      remoteId: data.id as string,
      externalId,
    });
  } catch (err) {
    console.error("[threads POST]", err);
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 });
  }
}
