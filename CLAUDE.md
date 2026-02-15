# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Baby AI** -- an interactive parenting simulator built for the Anthropic Hackathon (Feb 2026). An AI child presents realistic tantrum/behavioral scenarios. The parent responds via text (later voice). The child reacts realistically -- escalating with harshness, de-escalating with empathy. After interaction, a scorecard reveals what the child actually heard/felt and why it matters developmentally.

One-liner: A baby flight simulator for parents.

## Setup

```bash
npm install
cp .env.example .env.local  # then add your ANTHROPIC_API_KEY
npm run dev
```

## Commands

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Production build
- `npm run start` - Run production build
- `npm run lint` - Run ESLint (flat config, v9)

## Environment

- `ANTHROPIC_API_KEY` - Required. Anthropic API key for Claude Haiku calls.
- `NEXT_PUBLIC_USE_MOCKS` - Optional. Set to `true` to use mock data instead of real API calls.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4 via `@tailwindcss/postcss`
- **Animations**: Framer Motion
- **Charts**: Recharts (scorecard emotional arc)
- **AI**: Anthropic Claude Haiku via `@anthropic-ai/sdk`
- **Voice**: TTS/STT provider TBD -- architecture must be pluggable
- **Path alias**: `@/*` maps to project root
- **Package manager**: npm

## AI Integration

Uses `@anthropic-ai/sdk` with `messages.create` + `tool_use` for structured JSON enforcement. No agent SDK. Model: `claude-3-haiku-20240307` (Haiku 4.5 had persistent 529 errors; upgrade when stable).

Three separate LLM calls with distinct system prompts (API routes and response shapes are references -- final design TBD during implementation):

1. **Child AI** -- called per exchange. Scenario-specific system prompt. Returns structured JSON. Full conversation history passed each call.
2. **Analysis AI** -- called once after interaction ends. Different system prompt (expert analyst, NOT child persona). Returns scorecard data.
3. **Pattern Analysis AI** (future) -- cross-scenario patterns after 2-3 scenarios.

### System Prompt Structure

Each scenario gets its own complete system prompt (not shared base + modifier) with 5 sections: identity, scenario & starting state, reaction rules, conversation arc, output format.

Key instruction: "You are a real child, not a teaching tool. Do not make it easy for the parent."

## Scenarios

Four scenarios, each with unique system prompt and key insight:

1. **Toy Store Meltdown** -- child 5-6, wants expensive toy
2. **"I'm Stupid"** -- child 7, math homework frustration
3. **"I HATE YOU"** -- child 6, angry about denied party
4. **The Lie** -- child 7, hid chocolate wrappers

## State Management

- No database. No sessions. No persistent server state.
- Conversation history is an array in React state.
- Full history passed with every API call (Claude is stateless).

## UI Patterns

- **Interaction layout**: Three-panel (child avatar left, screenplay conversation center, emotional dashboard right)
- **Conversation display**: Screenplay format -- only recent exchanges visible, NOT a scrolling chat log
- **Brain visualization**: SVG driven by safety score (thinking brain vs survival brain)
- **"What You Said vs What They Heard"**: Flash overlay between exchanges
- **Scorecard**: Emotional arc chart, exchange replay, highlight moment, key insight
- **Voice input**: `ParentInput` accepts a string message, source (keyboard or mic) doesn't matter
- **Scenario intro**: Video plays in a neo-brutalism card before interaction starts. Auto-transitions on video end. Skip via button or Escape key. Gracefully skips if no video exists.

## Scenario Assets

Per-scenario static assets live in `public/scenarios/{scenario-id}/`. Tracked via a manifest in `lib/scenario-assets.ts`.

**Convention:**
```
public/scenarios/{scenario-id}/
  profile.png     -- child photo for home page card
  intro.mp4       -- intro video before interaction
  *.png/jpg       -- additional images for within-scenario use
```

**Adding assets:** Drop the file in the right folder, then update `SCENARIO_ASSETS` in `lib/scenario-assets.ts` to register it. Helper functions (`getProfileImagePath`, `getIntroVideoPath`) return `null` when an asset isn't registered.

**Dev page:** The Scenario Config tab shows asset status per scenario.

## Design System

**Style: Warm Brutalism** -- Neo Brutalism's structural boldness (thick borders, offset shadows, clear hierarchy) paired with a neutral-warm palette and dynamic emotional coloring.

**Component Library**: [neobrutalism.dev](https://www.neobrutalism.dev/) -- shadcn/ui components restyled with neobrutalist aesthetics. Components live in `components/ui/` and are fully owned/customizable.

**Installed Components**: Button, Card, Input, Label, Badge, Progress, Dialog, Tooltip

**Key CSS Utilities** (from neobrutalism.dev):

- `border-2 border-border` -- 2px solid borders
- `shadow-shadow` -- offset hard shadow
- `rounded-base` -- border radius (5px)
- `font-heading` / `font-base` -- DM Sans Bold / Inter Medium
- `bg-main` / `text-main-foreground` -- primary orange surface + white text
- `bg-secondary-background` -- white surface
- `bg-background` -- warm #F5F3F0 background

**Custom Color Tokens** (in globals.css):

- Child: `bg-child-bg`, `text-child-accent` (orange)
- Parent: `bg-parent-bg`, `text-parent-accent` (blue)
- Semantic: `bg-danger`, `bg-success`, `bg-warning` + `-bg` variants
- Dashboard tints: `bg-dashboard-tint-safe/neutral/tense/crisis`

**Fonts**: DM Sans (headings, `--font-dm-sans`) + Inter (body, `--font-inter`) via `next/font/google`

**Animation**: Framer Motion for UI interactions, `tw-animate-css` for Tailwind animations. Import motion from `motion/react`.

**Dependencies**: `tw-animate-css`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@radix-ui/react-*` (various), `lucide-react`

## Key Rules

- Max exchanges per scenario is TBD.
- Child speaks first in every scenario.
- All JSON schemas, API endpoints, and response structures in `/docs/` are **references and starting points**, not final specs.
- Deeper product/technical context in `/docs/` (thesis.md, product_context.md, tech_context.md, overview_context.md).

## Gotchas

- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin, not the v3 `tailwindcss` PostCSS plugin. Theme config is via CSS custom properties in `globals.css`, not `tailwind.config.js`.
- **Framer Motion**: Import from `motion/react`, not `framer-motion` directly.
- **Next.js 16 App Router**: All pages are server components by default. Add `"use client"` for components using React state, effects, or browser APIs.

## Skills & Tools Usage

### When Building UI (landing page, interaction screen, scorecard, any component)

**Design workflow: `ui-ux-pro-max` FIRST (decide what to build) → `frontend-design` SECOND (build it beautifully)**

- **`/frontend-design`** -- When actually creating or modifying pages/components/layouts. Provides creative implementation direction to ensure distinctive, non-generic code.
- **`/web-design-guidelines`** -- Use when reviewing existing UI for accessibility, UX compliance, or design audit.
- **`/vercel-react-best-practices`** -- Use when writing, reviewing, or refactoring React/Next.js components for performance (memoization, bundle size, data fetching patterns).
- **Playwright MCP** (`browser_snapshot`, `browser_navigate`, `browser_click`) -- Only use when explicitly asked by the user. Do NOT use for routine verification after building features. Lint checks and build compilation are sufficient for verification unless the user specifically requests Playwright testing.

### When Building API Routes & LLM Integration

- **Context7 MCP** (`resolve-library-id` + `query-docs`) -- ALWAYS use to look up current Anthropic SDK docs, Framer Motion API, Recharts API, or any library docs before writing integration code. Never rely on memory for API shapes.
- **`/feature-dev`** -- Use for guided development of complex features (e.g., the child interaction API route, the analysis endpoint, the interaction state machine).

### When Planning & Architecting

- **`/superpowers:brainstorming`** -- MUST use before any creative work: designing new features, building components, adding functionality. Explores intent and requirements before implementation.
- **`/superpowers:writing-plans`** -- Use for multi-step implementation planning when you have specs or requirements.
- **`/superpowers:executing-plans`** -- Use when executing a written implementation plan with review checkpoints.
- **`/superpowers:using-git-worktrees`** -- Use when setting up worktrees for parallel development.
- **`/superpowers:dispatching-parallel-agents`** -- Use when facing 2+ independent tasks that can be worked on without shared state.

### When Verifying & Debugging

- **`/superpowers:verification-before-completion`** -- MUST use before claiming any feature is complete. Run verification commands and confirm output before making success claims.
- **`/superpowers:systematic-debugging`** -- Use when encountering any bug, test failure, or unexpected behavior. Do not guess at fixes.
- **`/superpowers:test-driven-development`** -- Use when implementing features or bugfixes.

### When Reviewing Code

- **`pr-review-toolkit:code-reviewer`** subagent -- Use after writing or modifying code to check adherence to project conventions.
- **`pr-review-toolkit:silent-failure-hunter`** subagent -- Use after building API routes or any code with error handling/catch blocks.
- **`pr-review-toolkit:code-simplifier`** subagent -- Use after completing a feature to simplify for clarity and maintainability.
- **`pr-review-toolkit:type-design-analyzer`** subagent -- Use when introducing new TypeScript types or interfaces (e.g., shared types for child response, scorecard data, exchange).
- **`/code-review`** -- Use before merging branches or creating PRs.

### When Completing Work

- **`/superpowers:finishing-a-development-branch`** -- Use when a worktree/branch is complete and ready to merge.
- **`/superpowers:requesting-code-review`** -- Use when completing major features to verify work meets requirements.
- **`/superpowers:receiving-code-review`** -- Use when handling review feedback with technical rigor.

### When Updating Project Context

- **`/claude-md-management:revise-claude-md`** -- Use to update CLAUDE.md with learnings from a session.
- **`/claude-md-management:claude-md-improver`** -- Use to audit and improve CLAUDE.md quality.

## Session Protocol

- **On session start**: Read `STATUS.md` to understand current progress. Read `docs/implementation-plan.md` to understand what's next.
- **On completing work**: Update `STATUS.md` with what was done, any deviations, and what's next.
- **On encountering a change in approach**: Log it in `STATUS.md` Decision Log before proceeding.

## Key Config

- `tsconfig.json` - Strict mode, ES2017 target, bundler module resolution
- `eslint.config.mjs` - Flat config extending `next/core-web-vitals` and `next/typescript`
- `postcss.config.mjs` - Tailwind v4 postcss plugin
- `next.config.ts` - Minimal, ready for customization
