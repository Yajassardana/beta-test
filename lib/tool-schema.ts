import { readFileSync, existsSync } from "fs";
import { join } from "path";

const SCHEMA_PATH = join(process.cwd(), "data", "tool-schema.json");

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

export function getToolSchema(): Record<string, unknown> {
  if (!existsSync(SCHEMA_PATH)) {
    return DEFAULT_SCHEMA;
  }
  try {
    const raw = readFileSync(SCHEMA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SCHEMA;
  }
}

export { DEFAULT_SCHEMA };
