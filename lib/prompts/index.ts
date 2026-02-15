import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ScenarioConfig } from "@/lib/types";
import { getToyStorePrompt } from "./toy-store";

const DATA_DIR = join(process.cwd(), "data", "prompts");

const fallbackGenerators: Record<string, (config: ScenarioConfig) => string> = {
  "toy-store": getToyStorePrompt,
};

export function getSystemPrompt(config: ScenarioConfig): string {
  const filePath = join(DATA_DIR, `${config.id}.txt`);

  if (existsSync(filePath)) {
    const template = readFileSync(filePath, "utf-8");
    return interpolate(template, config);
  }

  const fallback = fallbackGenerators[config.id];
  if (fallback) return fallback(config);

  throw new Error(`No prompt found for scenario: ${config.id}`);
}

function interpolate(template: string, config: ScenarioConfig): string {
  return template
    .replace(/\{\{child_name\}\}/g, config.child_name)
    .replace(/\{\{child_age\}\}/g, String(config.child_age))
    .replace(/\{\{opening_emotional_state\}\}/g, String(config.opening_emotional_state));
}
