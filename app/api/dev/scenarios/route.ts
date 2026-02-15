import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { ScenarioConfig } from "@/lib/types";

const DATA_DIR = join(process.cwd(), "data");
const SCENARIOS_FILE = join(DATA_DIR, "scenarios.json");

function loadScenarios(): Record<string, ScenarioConfig> {
  if (existsSync(SCENARIOS_FILE)) {
    return JSON.parse(readFileSync(SCENARIOS_FILE, "utf-8"));
  }
  // Fall back to code-defined scenarios
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { scenarios } = require("@/lib/scenarios");
  return scenarios;
}

function saveScenarios(data: Record<string, ScenarioConfig>) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SCENARIOS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET() {
  const scenarios = loadScenarios();
  return NextResponse.json(scenarios);
}

export async function PUT(request: NextRequest) {
  const { id, config } = await request.json();
  if (!id || !config) {
    return NextResponse.json(
      { error: "Missing id or config" },
      { status: 400 }
    );
  }

  const scenarios = loadScenarios();
  scenarios[id] = { ...config, id };
  saveScenarios(scenarios);
  return NextResponse.json({ ok: true });
}
