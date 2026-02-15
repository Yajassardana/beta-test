import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { ScorecardInsights } from "@/lib/types";
import {
  DEFAULT_ENDING_INSIGHTS,
  DEFAULT_SCENARIO_AHA,
} from "@/lib/scorecard-insights";

const INSIGHTS_PATH = join(process.cwd(), "data", "scorecard-insights.json");

function getInsights(): ScorecardInsights {
  let fileData: Partial<ScorecardInsights> = {};
  if (existsSync(INSIGHTS_PATH)) {
    try {
      const raw = readFileSync(INSIGHTS_PATH, "utf-8");
      fileData = JSON.parse(raw);
    } catch {
      // Fall through to defaults
    }
  }
  return {
    endings: { ...DEFAULT_ENDING_INSIGHTS, ...fileData.endings },
    scenarios: { ...DEFAULT_SCENARIO_AHA, ...fileData.scenarios },
  };
}

export async function GET() {
  return NextResponse.json(getInsights());
}

export async function PUT(request: NextRequest) {
  let body: Partial<ScorecardInsights>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const merged: ScorecardInsights = {
    endings: { ...DEFAULT_ENDING_INSIGHTS, ...body.endings },
    scenarios: { ...DEFAULT_SCENARIO_AHA, ...body.scenarios },
  };

  const dir = dirname(INSIGHTS_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(INSIGHTS_PATH, JSON.stringify(merged, null, 2), "utf-8");
  return NextResponse.json(merged);
}
