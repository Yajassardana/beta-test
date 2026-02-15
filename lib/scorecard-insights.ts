import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { ScorecardInsights, EndingInsight, ScenarioAha, ScorecardEnding } from "./types";

const INSIGHTS_PATH = join(process.cwd(), "data", "scorecard-insights.json");

export const DEFAULT_ENDING_INSIGHTS: Record<ScorecardEnding, EndingInsight> = {
  resolution: {
    headline: "This was the moment you got through.",
    insight:
      "Children can tolerate disappointment when they feel understood. The key wasn't fixing the problem or giving in -- it was showing the child that their feelings made sense, even when the answer was still no.",
  },
  meltdown: {
    headline: "This is where the connection broke.",
    insight:
      "When a child's thinking brain goes offline, they cannot process anything you say -- no matter how reasonable. Logic, consequences, and lectures all bounce off a brain in survival mode. The only way back is through safety.",
  },
  limbo: {
    headline: "You were close.",
    insight:
      "Consistency is what children need most when they're upset. The interaction ended before reaching a clear resolution, but the pattern of your responses shaped what the child took away from this moment.",
  },
};

export const DEFAULT_SCENARIO_AHA: Record<string, ScenarioAha> = {
  "toy-store": {
    technique: "Grant the Wish in Fantasy",
    explanation:
      "When you can't give a child what they want, give them the feeling of being understood. Wishing with them validates the desire without caving to it.",
    example: '"I wish I could buy you the WHOLE store!"',
  },
  "im-stupid": {
    technique: "Validate the Struggle, Not the Identity",
    explanation:
      'When a child says "I\'m stupid," they\'re describing how hard something feels, not asking for reassurance. "You\'re so smart!" dismisses the struggle. Naming the effort validates it.',
    example: '"That problem is really frustrating" vs "You\'re so smart!"',
  },
  "i-hate-you": {
    technique: '"I Hate You" Is a Trust Signal',
    explanation:
      "A child who says \"I hate you\" is telling you they feel safe enough to show you the worst of what they feel. The instinct is to punish, but the need is to stay.",
    example:
      '"You\'re really angry right now. I\'m not going anywhere."',
  },
  "the-lie": {
    technique: "A Lie Is Information, Not a Character Flaw",
    explanation:
      "Children don't lie to be deceptive -- they lie because telling the truth feels unsafe. The lie tells you something important: they needed to protect themselves from your reaction.",
    example:
      '"It sounds like something happened that felt hard to tell me about."',
  },
};

export function getScorecardInsights(): ScorecardInsights {
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
