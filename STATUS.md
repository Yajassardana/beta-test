# Baby AI -- Project Status

## Current Phase
Phase 5: Polish + Voice -- starting

## Completed
- [x] Phase 1: Foundation + LLM Integration
  - Deps installed, template cleaned, .env.example created
  - Shared types: ChildResponse, Exchange, ScenarioConfig (lib/types.ts)
  - Scenario config for Toy Store (lib/scenarios.ts)
  - Toy Store system prompt (data/prompts/toy-store.txt)
  - Anthropic client wrapper (lib/anthropic.ts) -- using claude-3-haiku-20240307
  - Child interaction API route (app/api/child-respond/route.ts) -- tool_use for JSON enforcement, 3x retry with backoff
  - Verified: API returns structured JSON, multi-exchange history works

- [x] Phase 2: Dev Tools Page
  - /dev page (app/dev/page.tsx) -- system prompt editor, scenario config editor, conversation tester, raw history inspector
  - Dev API routes: GET/PUT /api/dev/prompts, GET/PUT /api/dev/scenarios
  - Prompts stored as .txt files in data/prompts/ with {{placeholder}} substitution

- [x] Design System Migration (added before Phase 3, not in original plan)
  - Warm Brutalism design system via neobrutalism.dev components
  - shadcn/ui initialized, 8 neobrutalism components installed (Button, Card, Input, Label, Badge, Progress, Dialog, Tooltip)
  - CSS tokens in globals.css: neobrutalism base tokens + custom palette (child/parent accents, semantic colors, dashboard tints)
  - Fonts: DM Sans (headings) + Inter (body) via next/font/google
  - tw-animate-css, clsx, tailwind-merge, class-variance-authority, lucide-react, @radix-ui/* added as deps
  - lib/utils.ts with cn() utility
  - components.json for shadcn config

- [x] Phase 3A: Interaction UI
  - [x] Three-panel layout (child avatar left, screenplay center, dashboard right)
  - [x] Screenplay conversation format (last 3 exchanges visible, AnimatePresence transitions)
  - [x] Child avatar SVG (expression changes with intensity: calm/worried/upset)
  - [x] Emotional dashboard (score bars, dashboard tint transitions by safety score)
  - [x] Brain visualization SVG (Thinking Brain vs Survival Mode)
  - [x] "What They Heard" flash overlay -- removed from live chat (data still in API response + scorecard replay)
  - [x] Parent text input (neobrutalism Input + Button)
  - [x] Ending cards (resolution/meltdown/shutdown/limbo) with "See What Happened" button
  - [ ] State machine (intro -> interacting -> analyzing -> done) -- SKIPPED: not needed since scorecard is instant, no analysis LLM call

- [x] Phase 3B: Remaining Scenarios (partial)
  - [x] All 4 scenario configs in lib/scenarios.ts
  - [x] System prompts: toy-store.txt, im-stupid.txt (2 of 4)
  - [ ] System prompts: i-hate-you.txt, the-lie.txt (2 remaining)
  - [ ] Analysis API -- SKIPPED: scorecard uses interaction data directly, no analysis LLM needed

- [x] Phase 4A: Scorecard (no analysis LLM -- uses interaction data + hardcoded insights)
  - [x] Scorecard types (ScorecardEnding, EndingInsight, ScenarioAha, ScorecardInsights)
  - [x] Hardcoded ending insights + scenario AHA data with runtime loader (lib/scorecard-insights.ts)
  - [x] Pure utility functions for chart data, deltas, highlight moments (lib/scorecard-utils.ts)
  - [x] Emotional arc chart (Recharts LineChart with zone backgrounds, dual lines, turning point dot)
  - [x] Exchange replay with "what they actually heard" reveal (dark inverted panel, staggered entry)
  - [x] Scenario insight card (ending-specific colors, turning point quote, AHA technique)
  - [x] Scorecard orchestrator with staggered section animation
  - [x] Wired into interaction page with AnimatePresence transition from 3-panel to scorecard
  - [x] "See What Happened" button on EndingCard, "Try Again" to reset
  - [x] Scorecard insights API route (GET/PUT /api/dev/scorecard-insights)
  - [x] Dev page: 5th "Scorecard" tab with ending insights + scenario AHA editors
  - [x] Dev page: Scenario Config upgraded to structured/raw toggle

- [x] Phase 4B: Landing Page (done early, pulled forward from Phase 4)
  - [x] Hero section with DM Sans bold typography
  - [x] 4 scenario cards in 2x2 responsive grid
  - [x] Framer Motion stagger entry animations + hover effects
  - [x] Per-card accent colors (orange/blue/red/amber)
  - [x] Badge for child age + intensity
  - [x] Navigation to /scenario/[id]

- [x] Phase 4.5: Scorecard Polish
  - [x] TechniqueCard color styling (bg-main/5, text-main headings, orange-tinted example + reference pills)
  - [x] Removed "What They Heard" flash overlay from live chat (kept in scorecard replay)

- [x] Phase 5A: Scenario Intro + Asset System
  - [x] Asset convention: public/scenarios/{id}/ with manifest in lib/scenario-assets.ts
  - [x] ScenarioIntro component (video card with skip, keyboard shortcuts, graceful fallback)
  - [x] Scenario page phase state machine (intro -> interaction -> scorecard)
  - [x] Profile images on home page scenario cards (graceful fallback via onError)
  - [x] Dev page: asset info section in Scenario Config tab
  - [x] Moved public/im-stupid/ to public/scenarios/im-stupid/
  - [x] CLAUDE.md updated with asset convention docs

## Not Started
- [ ] Phase 5B: Polish + Voice

## Decision Log
| Date | Decision | Reasoning |
|------|----------|-----------|
| 2026-02-14 | Incremental phases, not parallel worktrees for Phase 1-2 | Solo developer, sequential phases build on each other |
| 2026-02-14 | System prompts as .txt files with {{placeholder}} substitution | Editable via dev tools page at runtime; TS files kept as fallback |
| 2026-02-14 | tool_use with tool_choice for JSON enforcement | Guarantees valid JSON output matching exact schema; no parsing needed |
| 2026-02-14 | Built Phase 2 (dev tools) alongside Phase 1 | User requested prompt/config editing immediately |
| 2026-02-14 | Scenario configs read from data/scenarios.json on server with fallback to code | Dev tools edits picked up by API route without restart |
| 2026-02-14 | Switched from claude-haiku-4-5-20251001 to claude-3-haiku-20240307 | Haiku 4.5 returning persistent 529 overloaded errors; Haiku 3 works with tool_use |
| 2026-02-14 | Warm Brutalism design system with neobrutalism.dev | Striking hackathon demo aesthetic + structural clarity for simulation/dashboard feel |
| 2026-02-14 | Pulled landing page forward from Phase 4B | Needed to verify design system end-to-end; landing page is a good test of the design tokens |
| 2026-02-14 | Custom ScoreBar instead of Progress component | Progress component doesn't support custom fill colors; inline styles simpler |
| 2026-02-14 | Switched back to claude-haiku-4-5-20251001 | 529 errors resolved; Haiku 4.5 is default, configurable via dev tools |
| 2026-02-14 | SSE streaming for child-respond API | Better UX -- dialogue streams word-by-word instead of waiting for full response |
| 2026-02-14 | Dev config system (model, temp, tokens, retry, max_exchanges) | All LLM params configurable from /dev page, stored in data/dev-config.json |
| 2026-02-14 | Tool response schema configurable from dev page | Schema editable via structured or raw JSON editor, stored in data/tool-schema.json |
| 2026-02-14 | Scorecard without analysis LLM | Scorecard derives entirely from interaction data (Exchange[] + ScenarioConfig) + hardcoded insights; no additional LLM call needed |
| 2026-02-14 | Scorecard insights as configurable data | Ending insights and scenario AHA techniques stored in data/scorecard-insights.json, editable from /dev page, merged with hardcoded defaults |
| 2026-02-15 | Static asset manifest over runtime detection | Next.js public/ files not dynamically listable; manifest in lib/scenario-assets.ts is simple and explicit for 4 scenarios |
| 2026-02-15 | Phase state machine for scenario page | Replaced showScorecard boolean with intro/interaction/scorecard phase enum; cleaner 3-state AnimatePresence |

## Key Gaps
1. **2 of 4 system prompts exist** -- toy-store.txt and im-stupid.txt exist. i-hate-you.txt and the-lie.txt still need to be written.
2. **No analysis API** -- the post-interaction analysis endpoint doesn't exist. LIKELY NOT NEEDED since scorecard works from interaction data + hardcoded insights.
3. **No voice integration** -- STT, TTS, voice tone analysis all Phase 5.
4. **No responsive design** -- interaction page is desktop-only (three-panel layout).
5. **No accessibility pass** -- no ARIA labels, focus management, keyboard nav audit.

## File Map
```
lib/types.ts              -- ChildResponse, Exchange, ScenarioConfig + scorecard types
lib/scenarios.ts          -- All 4 scenario configs + scenarioOrder array
lib/scenario-assets.ts    -- Asset manifest + path helpers (getProfileImagePath, getIntroVideoPath)
lib/scorecard-insights.ts -- Hardcoded ending insights + scenario AHA + loader
lib/scorecard-utils.ts    -- Pure functions: chart data, deltas, highlight moments
lib/utils.ts              -- cn() utility (clsx + tailwind-merge)
lib/anthropic.ts          -- Anthropic SDK client + MODEL constant (claude-haiku-4-5-20251001)
lib/tool-schema.ts        -- Tool schema loader (reads data/tool-schema.json with hardcoded fallback)
lib/stream-client.ts      -- SSE stream consumer for both scenario + dev pages
data/dev-config.json      -- LLM config (model, temp, tokens, retry, max_exchanges) -- created on first save
data/tool-schema.json     -- Tool response schema -- created on first save
app/api/dev/config/       -- GET/PUT: read/write LLM config
app/api/dev/tool-schema/  -- GET/PUT: read/write tool response schema
lib/prompts/index.ts      -- Prompt loader (reads .txt files, substitutes placeholders)
lib/prompts/toy-store.ts  -- Toy Store prompt fallback (TS function)
data/prompts/toy-store.txt -- Editable Toy Store system prompt
data/prompts/im-stupid.txt -- Editable "I'm Stupid" system prompt
data/scorecard-insights.json -- Ending insights + scenario AHA techniques -- created on first save
app/globals.css           -- Warm Brutalism CSS tokens (neobrutalism + custom)
app/layout.tsx            -- Root layout with DM Sans + Inter fonts
app/page.tsx              -- Landing page (hero + 4 scenario cards)
app/scenario/[id]/page.tsx -- Scenario page (intro -> interaction -> scorecard phases)
app/api/child-respond/    -- POST: parent message + history -> child response JSON
app/api/dev/prompts/      -- GET/PUT: read/write prompt text files
app/api/dev/scenarios/    -- GET/PUT: read/write scenario configs
app/api/dev/scorecard-insights/ -- GET/PUT: read/write scorecard insights
app/dev/page.tsx          -- Dev tools page (5 tabs: prompt, scenario, llm, schema, scorecard)
components/ui/            -- neobrutalism.dev components (8 installed)
components/scenario-intro.tsx -- Intro video card component (auto-play, skip, keyboard shortcuts)
components/scorecard/     -- Scorecard components (chart, replay, insight, orchestrator)
public/scenarios/{id}/    -- Per-scenario assets (profile images, intro videos, expression images)
components.json           -- shadcn/ui config
```
