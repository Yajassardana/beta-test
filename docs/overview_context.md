# CLAUDE.md — Baby AI

## What This Is

Baby AI is an interactive parenting simulator built for the Anthropic + Replit Hackathon (Feb 2026). An AI child presents a realistic tantrum/behavioral scenario. The user (parent) responds via text (later voice). The AI child reacts realistically — escalating with harshness, de-escalating with empathy. After the interaction, a scorecard reveals what the child actually heard/felt and why it matters developmentally.

**One-liner:** A baby flight simulator for parents.

## Tech Stack

- **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion, Recharts
- **Backend:** Next.js API routes
- **AI:** Anthropic Claude Haiku (claude-haiku-4-5-20251001) via Messages API
- **TTS (later):** ElevenLabs API
- **STT (later):** Web Speech API (browser-native)
- **Voice analysis (later):** Web Audio API

## Architecture Overview

### Three Separate LLM Calls (all plain `messages.create`, no agent SDK)

1. **Child AI** — Called once per exchange during interaction. Scenario-specific system prompt. Returns structured JSON. Conversation history passed in full each call (Claude is stateless).

2. **Analysis AI** — Called once after interaction ends. Different system prompt (expert analyst, NOT child persona). Receives full transcript. Returns scorecard data.

3. **Pattern Analysis AI** (future) — Called once after 2-3 scenarios. Cross-scenario patterns + parenting style type.

### Conversation State

- No persistent server state. No sessions. No database.
- Conversation history is an array in React state.
- Every `/api/child-respond` call receives the full history array + new parent message.
- The LLM manages emotional state implicitly through conversation history.

### Child LLM Response Schema (ALWAYS return this JSON)

```json
{
  "child_dialogue": "What the child says out loud",
  "child_inner_feeling": "What child actually feels (1 sentence, for adult understanding)",
  "emotional_safety_score": 35,
  "connection_score": 25,
  "intensity": 8,
  "what_child_heard": "Meaning the child extracted from parent's words (1 sentence)",
  "parent_approach_tag": "threatening|logical|dismissive|validating|fantasy|bargaining|guilt-tripping|empathetic",
  "is_resolved": false,
  "exchange_number": 2
}
```

### Analysis LLM Response (post-interaction)

Returns scorecard data: per-exchange analysis, emotional arc data points, highlight moment, overall assessment, one actionable learning. Tone: warm, not clinical. Non-judgmental.

## Scenario System Prompt Structure

Each scenario has its own complete system prompt with 5 sections:

1. **Identity** — Child name, age, speech patterns (short sentences, grammatical errors, dramatic, Hindi-English mix)
2. **Scenario & Starting State** — What happened, what child wants, initial emotion/intensity
3. **Reaction Rules** — How child responds to different parent approaches (logic → escalate, threats → escalate/shutdown, validation → test then soften, AHA technique → surprised then de-escalate). CRITICAL: react to tone metadata, not just words.
4. **Conversation Arc** — Early (thick of it, test parent), Middle (reflects pattern), Late (resolution or breakdown). Do NOT resolve too easily — even perfect responses need 2-3 consecutive good exchanges.
5. **Output Format** — Structured JSON only, no other text

**Key prompt instruction:** "You are a real child, not a teaching tool. Do not make it easy for the parent."

## Scenarios (4 total)

### Scenario 1: Toy Store Meltdown (Desire vs. Limits)

- Child 5-6, wants expensive toy, parent said no, melting down
- AHA: Grant wish in fantasy ("I wish I could buy the WHOLE store!")
- Common wrong: Logic ("too expensive") or threats ("stop crying or we leave")
- Why wrong: Child isn't asking for logic — they're overwhelmed by wanting

### Scenario 2: "I'm Stupid" (Self-Esteem Crisis)

- Child 7, math homework, slams book, "I'm stupid, I can't do anything"
- AHA: Validate struggle, not identity ("That problem is really frustrating")
- Common wrong: "No you're not! You're so smart!" (creates fixed mindset, links worth to achievement)

### Scenario 3: "I HATE YOU" (Anger / Emotional Expression)

- Child 6, told no party because homework, screams "I hate you"
- AHA: "You're really angry. It's okay to be angry at me. I'm still here."
- Common wrong: Guilt ("After everything I do?") or punishment ("Go to your room")
- Key insight: "I hate you" is a trust signal — child feels safe expressing worst emotion

### Scenario 4: The Lie (Honesty and Safety)

- Child 7, hid chocolate wrappers, lies about it
- AHA: "I found the wrappers. I think you were worried about what I'd say."
- Common wrong: "Don't LIE to me! Double punishment!"
- Key insight: A child's lie is information about relationship safety, not character

## File Structure Convention

```
/scenarios
  /scenario-1-toy-store
    config.json        — system prompt, child name/age, metadata
    key-insight.md     — pre-written insight for scorecard
  /scenario-2-im-stupid
  /scenario-3-i-hate-you
  /scenario-4-the-lie
```

## API Routes

- `POST ` — Takes: scenario_id, history[], parent_message, voice_metadata (optional). Returns: child response JSON.
- `POST ` — Takes: scenario_id, full transcript[]. Returns: scorecard data.

## UI Layout During Interaction

Three-panel layout:

- **Left:** Child avatar/expression
- **Center:** Conversation area (screenplay format — only last 2 exchanges visible, NOT scrolling chat)
- **Right:** Emotional dashboard (brain viz, safety/connection scores, "what child heard")
- **Bottom:** Input area (text input now, mic button later)

## Key Implementation Rules

- Conversation area is NOT a chat log. Screenplay format — only show the most recent exchange pair.
- "What You Said vs. What They Heard" flash: 2-second overlay between exchanges showing the gap.
- Brain visualization: SVG with two regions. Thinking Brain (green, prefrontal) opacity = safetyScore/100. Survival Brain (red, amygdala) opacity = 1 - safetyScore/100. Pulses when safety < 30.
- Scores are 0-100. Safety < 30 = thinking brain offline. 30-60 = partially receptive. > 60 = can cooperate.
- Max exchanges per scenario: 6. Resolve OR break down by exchange 5-6.
- Pre-generate opening lines (the child speaks first in every scenario).

## Current Phase: Phase 1 — Core Interaction Loop

**Goal:** Text input → API call → child responds → display response + raw scores. One scenario (Toy Store). No animations, no dashboard, no voice. Just validate the AI conversation works and the child feels real.

## Deeper Context

For full product thinking, scenario details, and technical specs, see:

- `/docs/thesis.md`
- `/docs/product_context.md`
- `/docs/tech_context.md`
