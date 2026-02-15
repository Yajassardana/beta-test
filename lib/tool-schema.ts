import { readFileSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "data");

const DEFAULT_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    child_dialogue: {
      type: "string",
      description: "The actual words the child says out loud",
    },
    what_child_heard: {
      type: "string",
      description:
        "The meaning the child extracted from the parent's words (1 sentence, visceral and simple, from the child's perspective)",
    },
    emotional_state: {
      type: "number",
      description: "0-10, the child's internal emotional state",
    },
    child_inner_feeling: {
      type: "string",
      description:
        "What the child is actually feeling but can't articulate (1 sentence)",
    },
    is_resolved: {
      type: "string",
      enum: ["ongoing", "resolution", "meltdown"],
      description:
        "Current state: ongoing = keep going, resolution = child re-engaged, meltdown = child beyond reach",
    },
  },
  required: [
    "child_dialogue",
    "what_child_heard",
    "emotional_state",
    "child_inner_feeling",
    "is_resolved",
  ],
};

export function getToolSchema(lang: "en" | "hi" = "en"): Record<string, unknown> {
  const filename = lang === "hi" ? "tool-schema-hi.json" : "tool-schema.json";
  const schemaPath = join(DATA_DIR, filename);

  if (existsSync(schemaPath)) {
    try {
      return JSON.parse(readFileSync(schemaPath, "utf-8"));
    } catch { /* fall through */ }
  }

  if (lang === "hi") return buildHindiSchema(getToolSchema("en"));
  return DEFAULT_SCHEMA;
}

export function buildHindiSchema(
  base: Record<string, unknown>
): Record<string, unknown> {
  const schema = structuredClone(base);
  const props = schema.properties as Record<string, unknown>;
  const required = schema.required as string[];

  schema.properties = {
    child_dialogue_devanagari: {
      type: "string",
      description:
        "The child's dialogue in Devanagari script (e.g., 'पापा, मुझे अभी चाहिए!'). MUST be output FIRST.",
    },
    ...props,
  };

  (schema.properties as Record<string, Record<string, string>>).child_dialogue =
    {
      type: "string",
      description:
        "The child's dialogue in Romanized Hindi (Hindi written in English letters, e.g., 'Papa, mujhe abhi chahiye!')",
    };

  schema.required = ["child_dialogue_devanagari", ...required];
  return schema;
}

export { DEFAULT_SCHEMA };
