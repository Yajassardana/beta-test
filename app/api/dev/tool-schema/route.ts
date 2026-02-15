import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { DEFAULT_SCHEMA } from "@/lib/tool-schema";

const SCHEMA_PATH = join(process.cwd(), "data", "tool-schema.json");

export async function GET() {
  if (!existsSync(SCHEMA_PATH)) {
    return NextResponse.json(DEFAULT_SCHEMA);
  }
  try {
    const raw = readFileSync(SCHEMA_PATH, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(DEFAULT_SCHEMA);
  }
}

export async function PUT(request: NextRequest) {
  let schema: Record<string, unknown>;
  try {
    schema = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof schema !== "object" || schema === null || !schema.type || !schema.properties) {
    return NextResponse.json(
      { error: "Schema must have 'type' and 'properties'" },
      { status: 400 }
    );
  }

  const dir = dirname(SCHEMA_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(SCHEMA_PATH, JSON.stringify(schema, null, 2), "utf-8");
  return NextResponse.json(schema);
}
