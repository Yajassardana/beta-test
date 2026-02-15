import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";

const DATA_DIR = join(process.cwd(), "data", "prompts");

export async function GET(request: NextRequest) {
  const scenarioId = request.nextUrl.searchParams.get("id");
  if (!scenarioId) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  const lang = request.nextUrl.searchParams.get("lang") || "en";
  const filename = lang === "hi" ? `${scenarioId}-hi.txt` : `${scenarioId}.txt`;
  const filePath = join(DATA_DIR, filename);

  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: `No prompt file for: ${scenarioId} (${lang})` },
      { status: 404 }
    );
  }

  const content = readFileSync(filePath, "utf-8");
  return NextResponse.json({ content });
}

export async function PUT(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang") || "en";
  const { id, content } = await request.json();

  if (!id || typeof content !== "string") {
    return NextResponse.json(
      { error: "Missing id or content" },
      { status: 400 }
    );
  }

  const filename = lang === "hi" ? `${id}-hi.txt` : `${id}.txt`;
  const filePath = join(DATA_DIR, filename);
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, content, "utf-8");
  return NextResponse.json({ ok: true });
}
