# Baby AI -- Step-by-Step Implementation Plan

## Context

Baby AI is an interactive parenting simulator for the Anthropic Hackathon (Feb 2026). Solo developer building incrementally -- each phase produces something working before moving on. Parallelization via worktrees comes later once independent streams emerge.

Key principle: **Get the AI conversation working first, then layer UI on top.** Not the other way around.

All JSON schemas, API shapes, and code references in `/docs/` are **starting points only** -- discover the right shapes during implementation by consulting Context7 MCP for library docs.

---

## Phase 1: Foundation + LLM Integration

**Goal:** Type a message, get a realistic AI child response, see it on screen. One scenario only (Toy Store).

**What gets built:**
- Install deps (`@anthropic-ai/sdk`, `framer-motion`, `recharts`)
- Clean up default Next.js template (remove boilerplate, update metadata)
- Create `.env.example` + `.env.local` with `ANTHROPIC_API_KEY`
- Create minimal shared types (only what this phase needs -- child response shape, exchange, scenario config)
- Create scenario config for Toy Store (metadata: child name, age, opening line, description)
- Build the child interaction API route -- receives parent message + history, calls Claude Haiku with system prompt, returns structured child response
- Write the Toy Store system prompt (identity, scenario, reaction rules, conversation arc, output format)
- Build a minimal interaction page -- text input, send button, display child's dialogue + raw JSON scores
- Conversation history managed as React state array, full history sent each API call

**Integration rule:** Use Context7 MCP to look up Anthropic SDK `messages.create` API before writing the integration. Do not guess at the SDK shape.

**Working milestone:** Navigate to `/scenario/toy-store` -> type "Stop crying right now!" -> AI child responds with realistic dialogue + emotional scores -> type again -> child reacts based on accumulated history.

---

## Phase 2: Dev Tools Page

**Goal:** A `/dev` route that gives the developer (you) fast iteration on prompts and configs without touching code.

**What gets built:**
- A dev-only page at `/dev` with:
  - **System prompt editor** -- load the current prompt for any scenario, edit in a textarea, save back to a file that the API route reads from
  - **Scenario selector** -- dropdown to switch between scenarios
  - **Conversation tester** -- send messages and see full JSON responses (not just dialogue)
  - **Conversation history inspector** -- see the full message array being sent to Claude
  - **Config panel** -- tweak scenario metadata (child name, age, opening line, max exchanges) and save
- Prompts and configs stored as files in the repo (e.g., `lib/prompts/toy-store.ts` or JSON/MD files -- whatever makes editing easiest)
- Dev page reads/writes these files via a simple API route

**Design note:** This is a bare-bones utility page, not a polished UI. Functional over pretty. But it makes prompt iteration 10x faster than editing code files.

**Working milestone:** Open `/dev` -> select Toy Store -> edit the system prompt -> save -> test a conversation -> see how the child's behavior changes -> iterate without restarting the server.

---

## Phase 3: Interaction Experience + Remaining Scenarios

**Goal:** Build the real interaction UI and expand to all 4 scenarios. This is where worktrees can start.

**This phase splits into 2 parallel worktrees:**

### Worktree A: Interaction UI
- Three-panel layout (child avatar left, screenplay conversation center, emotional dashboard right)
- Conversation display in screenplay format (recent exchanges only, NOT a scrolling chat log)
- Brain visualization SVG (thinking brain vs survival brain, driven by safety score)
- Emotional dashboard with live scores and "what child heard" text
- "What You Said vs What They Heard" flash overlay between exchanges
- Parent text input component (accepts string -- voice-ready architecture)
- Interaction state machine (intro -> interacting -> analyzing -> done)

### Worktree B: Remaining Scenarios + Analysis API
- Write system prompts for "I'm Stupid", "I HATE YOU", "The Lie"
- Build the analysis API route -- separate system prompt (expert analyst, NOT child persona), receives full transcript, returns scorecard data
- Write the analysis system prompt
- Test all 4 scenarios via the dev tools page and/or curl

**After merge:** Real interaction UI works with all 4 scenarios + analysis endpoint is ready for the scorecard.

**Working milestone:** Navigate to `/scenario/toy-store` -> three-panel layout -> child speaks first -> parent responds -> scores update live -> brain visualization reacts -> "what they heard" flash appears -> complete the interaction -> "analyzing..." loading state.

---

## Phase 4: Scorecard + Landing Page

**Goal:** Complete the flow end-to-end: landing -> scenario select -> interact -> scorecard.

**This phase splits into 2 parallel worktrees:**

### Worktree A: Scorecard
- Emotional arc chart (Recharts -- safety, connection, intensity over exchanges)
- Exchange-by-exchange replay with color-coded "what they heard" cards
- Highlight moment callout (best or worst thing said)
- Scenario-specific key insight
- Actionable learning takeaway
- Wire scorecard into the interaction flow (after analysis completes)

### Worktree B: Landing Page
- Hero section
- Scenario cards with Framer Motion stagger animations and hover effects
- Responsive grid layout for 4 scenario cards
- Each card navigates to `/scenario/[id]`
- Use `ui-ux-pro-max` for design system, then `frontend-design` for implementation

**After merge:** Complete user journey works end-to-end.

**Working milestone:** Visit `/` -> see 4 animated scenario cards -> click one -> full interaction -> scorecard with emotional arc chart, exchange replay, and key insight -> navigate back and try another.

---

## Phase 5: Polish + Voice

**Goal:** Demo-ready product. Animations, responsive design, accessibility, and voice integration.

**What gets built:**
- Animation polish (transitions between pages, micro-interactions)
- Responsive design (mobile + desktop)
- Accessibility pass (contrast, focus states, ARIA labels, keyboard nav)
- Voice integration (provider TBD -- research ElevenLabs, browser SpeechSynthesis, Deepgram)
- Voice tone analysis (if time permits -- Web Audio API feature extraction)
- End-to-end testing with Playwright MCP

**Working milestone:** Full demo flow works smoothly with polished animations, readable on all screen sizes, voice input/output functional.

---

## Worktree Ownership Summary

Parallelization happens in Phases 3 and 4. File ownership ensures zero merge conflicts:

| Phase | Worktree A owns | Worktree B owns |
|-------|-----------------|-----------------|
| Phase 3 | `app/scenario/[id]/`, `components/interaction/`, `lib/hooks/` | `lib/prompts/`, `app/api/analyze/` |
| Phase 4 | `components/scorecard/`, scorecard wiring | `app/page.tsx`, `components/landing/` |

Shared files (`lib/types.ts`, `lib/scenarios.ts`) are created in Phase 1 and only read (never modified) by worktrees.

---

## Session Statefulness

Claude Code sessions are stateless by default. To maintain continuity across sessions, we use two mechanisms:

### 1. `STATUS.md` (Project State File)

A file at the project root that every Claude Code session reads at start and updates when completing work.

### 2. CLAUDE.md Session Protocol

Every Claude Code instance:
- **On session start**: Read `STATUS.md` to understand current progress. Read the implementation plan (`docs/implementation-plan.md`) to understand what's next.
- **On completing work**: Update `STATUS.md` with what was done, any deviations, and what's next.
- **On encountering a change in approach**: Log it in the Decision Log before proceeding.

---

## Rules Across All Phases

- **Context7 MCP**: Use for ALL external library integration (Anthropic SDK, Framer Motion, Recharts, etc.). Never guess at API shapes.
- **`ui-ux-pro-max`**: Run before any UI phase to generate the design system. Persist with `--persist` flag.
- **`/frontend-design`**: Use when actually building UI components/pages.
- **Playwright MCP**: Use to verify UI after each phase. Navigate, snapshot, interact, check console.
- **Types evolve**: `lib/types.ts` starts minimal in Phase 1 and grows as needed. Don't pre-define everything upfront.
- **Prompts are files**: System prompts live as editable files that the dev tools page can read/write. Not hardcoded in API route code.
- **Session statefulness**: Read `STATUS.md` at session start, update it when completing work. Log any plan deviations in the Decision Log.

---

## Verification

After Phase 4 (full flow working):
1. Navigate to `localhost:3000` -- landing page with 4 scenario cards
2. Click "Toy Store Meltdown" -- interaction layout, child speaks first
3. Type harsh response -- child escalates, safety drops, brain goes red, "what they heard" flash
4. Type empathetic response -- child softens, scores improve
5. Complete the interaction -- "Analyzing..." loading, then scorecard
6. Scorecard shows emotional arc, exchange replay (color-coded), highlight moment, key insight
7. Navigate back, try different scenario
8. Open `/dev` -- edit a system prompt, save, test immediately
9. Check browser console for errors
10. Use Playwright MCP to verify UI elements and interactions
