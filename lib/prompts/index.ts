import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ScenarioConfig } from "@/lib/types";
import { getToyStorePrompt } from "./toy-store";

const DATA_DIR = join(process.cwd(), "data", "prompts");

const fallbackGenerators: Record<string, (config: ScenarioConfig) => string> = {
  "toy-store": getToyStorePrompt,
};

export const HINDI_PROMPT_SUFFIX = `

LANGUAGE: Respond in Romanized Hindi (Hindi written in English letters) for child_dialogue. Also provide the same dialogue in Devanagari script in child_dialogue_devanagari. Always output child_dialogue_devanagari BEFORE child_dialogue in the JSON. Example: child_dialogue_devanagari: "मुझे नहीं चाहिए", child_dialogue: "Mujhe nahi chahiye". what_child_heard and child_inner_feeling should also be in Romanized Hindi.`;

export function getSystemPrompt(
  config: ScenarioConfig,
  lang: "en" | "hi" = "en"
): string {
  const filename = lang === "hi" ? `${config.id}-hi.txt` : `${config.id}.txt`;
  const filePath = join(DATA_DIR, filename);

  if (existsSync(filePath)) {
    const template = readFileSync(filePath, "utf-8");
    return interpolate(template, config);
  }

  if (lang === "hi") {
    return getSystemPrompt(config, "en") + HINDI_PROMPT_SUFFIX;
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
