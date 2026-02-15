import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { DevConfig } from "@/lib/types";

const CONFIG_PATH = join(process.cwd(), "data", "dev-config.json");

const DEFAULTS: DevConfig = {
  model: "claude-haiku-4-5-20251001",
  temperature: 1,
  max_tokens: 1024,
  retry_count: 3,
  retry_base_delay_ms: 1000,
  max_exchanges: 5,
};

export function getDevConfig(): DevConfig {
  if (!existsSync(CONFIG_PATH)) {
    return DEFAULTS;
  }
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function GET() {
  return NextResponse.json(getDevConfig());
}

export async function PUT(request: NextRequest) {
  let body: Partial<DevConfig>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const config: DevConfig = { ...DEFAULTS, ...body };

  if (typeof config.temperature !== "number" || config.temperature < 0 || config.temperature > 1) {
    return NextResponse.json({ error: "temperature must be 0-1" }, { status: 400 });
  }
  if (typeof config.max_tokens !== "number" || config.max_tokens < 1) {
    return NextResponse.json({ error: "max_tokens must be positive" }, { status: 400 });
  }
  if (typeof config.retry_count !== "number" || config.retry_count < 0) {
    return NextResponse.json({ error: "retry_count must be >= 0" }, { status: 400 });
  }
  if (typeof config.max_exchanges !== "number" || config.max_exchanges < 1) {
    return NextResponse.json({ error: "max_exchanges must be >= 1" }, { status: 400 });
  }

  const dir = dirname(CONFIG_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  return NextResponse.json(config);
}
