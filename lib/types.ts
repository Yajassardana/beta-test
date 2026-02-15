export type InteractionEnding = "ongoing" | "resolution" | "meltdown";

export type ScorecardEnding = "resolution" | "meltdown" | "limbo";

export interface EndingInsight {
  headline: string;
  insight: string;
}

export interface ScenarioAha {
  technique: string;
  explanation: string;
  example: string;
  references?: Array<{ label: string; url: string }>;
}

export interface ResearchReference {
  title: string;
  url: string;
  snippet: string;
}

export interface ScorecardInsights {
  endings: Record<ScorecardEnding, EndingInsight>;
  scenarios: Record<string, ScenarioAha>;
  research: Record<string, ResearchReference[]>;
}

export interface ChildResponse {
  child_dialogue: string;
  child_dialogue_devanagari?: string;
  what_child_heard: string;
  emotional_state: number;
  child_inner_feeling: string;
  is_resolved: InteractionEnding;
}

export interface Exchange {
  parent_message: string;
  child_response: ChildResponse;
}

export interface DevConfig {
  model: string;
  temperature: number;
  max_tokens: number;
  retry_count: number;
  retry_base_delay_ms: number;
  max_exchanges: number;
}

export interface ScenarioConfig {
  id: string;
  title: string;
  description: string;
  child_name: string;
  child_age: number;
  opening_line: string;
  opening_line_hindi: string;
  opening_inner_feeling: string;
  opening_emotional_state: number;
}
