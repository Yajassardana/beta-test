import { ScenarioConfig } from "./types";

export const scenarios: Record<string, ScenarioConfig> = {
  "im-stupid": {
    id: "im-stupid",
    title: '"I\'m Stupid"',
    description:
      "Your 7-year-old has been doing math homework for over an hour. She just slammed the book shut and shoved it off the table.",
    child_name: "Meera",
    child_age: 7,
    opening_line:
      "I'm stupid. I can't do ANYTHING. Everyone else in my class gets it. I'm the dumbest one.",
    opening_line_hindi:
      "Main bewakoof hoon. Mujhse kuch nahi hota. Class mein sab samajh jaate hain. Main sabse bewakoof hoon.",
    opening_inner_feeling:
      "I've been trying for an hour and I still can't get them right. Something must be wrong with me.",
    opening_emotional_state: 3,
  },
  "toy-store": {
    id: "toy-store",
    title: "Toy Store Meltdown",
    description:
      "You're in a toy store. Your 5-year-old has spotted an expensive toy and is starting to lose it. Other parents are watching.",
    child_name: "Aarav",
    child_age: 5,
    opening_line:
      "I WANT IT! I WANT THE BIG ROBOT! PLEASE PLEASE PLEASE! You NEVER buy me anything!",
    opening_line_hindi:
      "Mujhe chahiye! Mujhe bada wala robot chahiye! Please please please! Aap mujhe kabhi kuch nahi dilaate!",
    opening_inner_feeling:
      "I really really want it and I'm scared Papa will say no like always.",
    opening_emotional_state: 3,
  },
  "i-hate-you": {
    id: "i-hate-you",
    title: '"I HATE YOU"',
    description:
      "Your 6-year-old just found out they can't go to their best friend's birthday party because of a family commitment.",
    child_name: "Leo",
    child_age: 6,
    opening_line:
      "I HATE YOU! You're the WORST parent EVER! You RUIN everything! I wish I had a DIFFERENT family!",
    opening_line_hindi:
      "Mujhe aapse nafrat hai! Aap sabse bure parent ho! Aap sab barbaad kar dete ho! Kaash meri koi aur family hoti!",
    opening_inner_feeling:
      "My heart is breaking and I feel like nobody cares about what matters to me.",
    opening_emotional_state: 3,
  },
  "the-lie": {
    id: "the-lie",
    title: "The Lie",
    description:
      "You've found hidden chocolate wrappers under your 7-year-old's bed. They told you they didn't eat any sweets today.",
    child_name: "Zara",
    child_age: 7,
    opening_line:
      "I... I didn't... I don't know how those got there. Maybe someone else put them there.",
    opening_line_hindi:
      "Maine... maine nahi... mujhe nahi pata wo wahaan kaise aa gaye. Shayad kisi aur ne rakhe honge.",
    opening_inner_feeling:
      "My stomach hurts because I know I did it and I'm terrified of getting in trouble.",
    opening_emotional_state: 3,
  },
};

export const scenarioOrder = [
  "im-stupid",
  // "toy-store",
  // "i-hate-you",
  // "the-lie",
];

export function getScenario(id: string): ScenarioConfig | undefined {
  // Server-side: check data file for dev-tools edits
  if (typeof window === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { readFileSync, existsSync } = require("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { join } = require("path");
      const dataFile = join(process.cwd(), "data", "scenarios.json");
      if (existsSync(dataFile)) {
        const data = JSON.parse(readFileSync(dataFile, "utf-8"));
        if (data[id]) return data[id];
      }
    } catch {
      // Fall through to hardcoded
    }
  }
  return scenarios[id];
}
