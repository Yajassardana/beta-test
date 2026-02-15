import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { SCENARIO_ASSETS, type ScenarioAssetManifest } from "@/lib/scenario-assets";

const ASSETS_PATH = join(process.cwd(), "data", "assets.json");

function loadManifest(): Record<string, ScenarioAssetManifest> {
  const defaults = { ...SCENARIO_ASSETS };
  if (!existsSync(ASSETS_PATH)) return defaults;
  try {
    const raw = readFileSync(ASSETS_PATH, "utf-8");
    const saved = JSON.parse(raw) as Record<string, ScenarioAssetManifest>;
    const merged: Record<string, ScenarioAssetManifest> = {};
    for (const id of Object.keys(defaults)) {
      merged[id] = { ...defaults[id], ...saved[id] };
    }
    for (const id of Object.keys(saved)) {
      if (!merged[id]) merged[id] = saved[id];
    }
    return merged;
  } catch {
    return defaults;
  }
}

export async function GET() {
  return NextResponse.json(loadManifest());
}

export async function PUT(request: NextRequest) {
  let body: { id: string; manifest: ScenarioAssetManifest };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id || typeof body.id !== "string") {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const current = loadManifest();
  current[body.id] = body.manifest;

  const dir = dirname(ASSETS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(ASSETS_PATH, JSON.stringify(current, null, 2), "utf-8");
  return NextResponse.json(current);
}
