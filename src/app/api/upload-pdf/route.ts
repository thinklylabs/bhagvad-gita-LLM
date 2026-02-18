import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const run = promisify(execFile);

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tempPdf = join(tmpdir(), `gita-${Date.now()}.pdf`);
  const tempTxt = join(tmpdir(), `gita-${Date.now()}.txt`);
  const root = resolve(process.cwd());

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file)
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.type !== "application/pdf")
      return NextResponse.json({ error: "Only PDFs" }, { status: 400 });

    // Save uploaded PDF to temp
    await writeFile(tempPdf, Buffer.from(await file.arrayBuffer()));
    console.log(`[upload] Saved ${file.name} (${file.size} bytes)`);

    // STEP 1: Extract text (mupdf in its own process - WASM memory freed on exit)
    console.log("[upload] Step 1: Extracting text...");
    const { stdout: out1 } = await run("node", [
      join(root, "scripts/extract-text.mjs"),
      tempPdf,
      tempTxt,
    ], {
      cwd: root,
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=4096" },
    });
    console.log(`[upload] ${out1.trim()}`);

    // STEP 2: Chunk + embed + store (clean process, no WASM baggage)
    console.log("[upload] Step 2: Embedding and storing...");
    const { stdout: out2 } = await run("node", [
      join(root, "scripts/embed-and-store.mjs"),
      tempTxt,
      file.name,
    ], {
      cwd: root,
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
      env: { ...process.env },
    });
    console.log(`[upload] ${out2.trim()}`);

    const match = out2.match(/(\d+) chunks stored/);
    const chunksProcessed = match ? parseInt(match[1], 10) : 0;

    return NextResponse.json({
      success: true,
      chunksProcessed,
      message: `Processed "${file.name}" into ${chunksProcessed} searchable chunks`,
    });
  } catch (err) {
    console.error("[upload] Error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Processing failed", details: msg }, { status: 500 });
  } finally {
    await unlink(tempPdf).catch(() => {});
    await unlink(tempTxt).catch(() => {});
  }
}
