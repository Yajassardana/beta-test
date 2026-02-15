import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data", "prompts");

export async function GET(request: NextRequest) {
  const scenarioId = request.nextUrl.searchParams.get("id");
  if (!scenarioId) {
    return NextResponse.json({ error: "Missing id param" }, { status: 400 });
  }

  const filePath = join(DATA_DIR, `${scenarioId}.txt`);
  if (!existsSync(filePath)) {
    return NextResponse.json(
      { error: `No prompt file for: ${scenarioId}` },
      { status: 404 }
    );
  }

  const content = readFileSync(filePath, "utf-8");
  return NextResponse.json({ content });
}

export async function PUT(request: NextRequest) {
  const { id, content } = await request.json();
  if (!id || typeof content !== "string") {
    return NextResponse.json(
      { error: "Missing id or content" },
      { status: 400 }
    );
  }

  const filePath = join(DATA_DIR, `${id}.txt`);
  writeFileSync(filePath, content, "utf-8");
  return NextResponse.json({ ok: true });
}
