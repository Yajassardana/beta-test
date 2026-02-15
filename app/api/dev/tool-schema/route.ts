import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { getToolSchema } from "@/lib/tool-schema";

export async function GET(request: NextRequest) {
  const lang = (request.nextUrl.searchParams.get("lang") || "en") as "en" | "hi";
  const schema = getToolSchema(lang);
  return NextResponse.json(schema);
}

export async function PUT(request: NextRequest) {
  const lang = (request.nextUrl.searchParams.get("lang") || "en") as "en" | "hi";

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

  const filename = lang === "hi" ? "tool-schema-hi.json" : "tool-schema.json";
  const schemaPath = join(process.cwd(), "data", filename);
  const dir = dirname(schemaPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(schemaPath, JSON.stringify(schema, null, 2), "utf-8");
  return NextResponse.json(schema);
}
