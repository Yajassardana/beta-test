# Hackathon Submission Answers

---

## 1. The Problem It Solves

Indian families are undergoing a structural shift from joint families to nuclear households in metro cities. The generational wisdom transfer that parents relied on for centuries (grandparents, aunts, uncles modeling how to handle a screaming toddler at 9pm) is gone. New-generation parents aspire to parent differently from how they were raised, where physical discipline and emotional dismissal were normalized. They've heard of "gentle parenting" but have no idea how to apply it when their 4-year-old is on the floor mid-meltdown.

**Baby AI is a flight simulator for parents.** The same way pilots train on simulators before flying real planes, parents can practice responding to realistic child behavioral scenarios in a safe, judgment-free environment before the stakes are real.

### What it does:

- **Simulates realistic child tantrums.** An AI child (powered by Claude) presents challenging scenarios: a toy store meltdown, a child calling themselves stupid, screaming "I hate you," hiding a lie. Each scenario is grounded in developmental psychology and culturally authentic to Indian households.
- **Reacts realistically to parenting responses.** The AI child escalates when met with harshness, logic, or dismissal. It de-escalates when met with empathy, validation, and developmentally-appropriate techniques. It does NOT make it easy for the parent, just like a real child wouldn't.
- **Delivers a visceral learning moment.** After the interaction, a scorecard shows the child's emotional arc across exchanges, what the parent said vs. what the child actually *heard*, the specific turning point where things went right or wrong, and the developmental technique that would have worked (e.g., "Grant the wish in fantasy" for toy demands, "Validate the struggle, not the identity" for "I'm stupid").
- **Supports voice interaction in English and Hindi.** Parents can speak naturally using voice input (Sarvam AI for Indian-accented English and Hindi), and the AI child responds with text-to-speech, making the experience feel like a real conversation.

### Why it matters:

The 0-6 year window is when attachment patterns, emotional regulation circuits, and core self-worth beliefs get neurologically wired. Small daily interactions, repeated thousands of times, literally shape the child's brain architecture. Every response a parent gives in these critical moments has lasting developmental impact. Most parents unconsciously repeat patterns from their own childhood without realizing the long-term consequences.

Baby AI makes the invisible visible: what your words actually do to a developing brain.

---

## 2. Challenges I Ran Into

### Claude Haiku 4.5 Persistent 529 Overload Errors

Early in development, we chose Claude Haiku 4.5 (`claude-haiku-4-5-20251001`) for the child AI. It immediately started returning HTTP 529 (API Overloaded) errors when called with `tool_use` + `tool_choice`, the exact pattern we needed for structured JSON enforcement. The errors were persistent across every attempt. We implemented a 3x retry loop with exponential backoff, but the errors kept firing. We downgraded to Haiku 3 (`claude-3-haiku-20240307`), which worked reliably with `tool_use`. Later in the hackathon, the 529 errors resolved and we switched back to Haiku 4.5. We also kept the model configurable via a dev tools page so we could hot-swap without code changes if it happened again.

### Making the LLM Stay in Character as a Realistic Child

The hardest challenge was preventing Claude from breaking character. Claude naturally drifts toward being cooperative, educational, or easy to pacify. A real 5-year-old mid-tantrum does none of those things. We solved this with heavily engineered system prompts that include:

- Explicit anti-teaching instruction: *"You are a real child, not a teaching tool. Do not make it easy for the parent."*
- Reaction rule mappings: a natural language state machine that maps parent behaviors (logical explanations, threats, validation, specific AHA techniques) to realistic child emotional responses
- 2-3 one-shot example exchanges per scenario to set tone and texture, which we found more effective than detailed persona descriptions
- Conversation arc rules: the child can't just flip from angry to happy in one exchange. Emotional shifts require multiple exchanges of consistent empathy.

Each of the 4 scenarios gets its own complete system prompt because the child's personality, triggers, and de-escalation patterns are fundamentally different across scenarios.

### TTS Audio Choppiness with WebSocket Streaming

Sarvam AI's TTS WebSocket streaming produced choppy, stuttering audio playback. Two root causes: (1) our "done detection" used a debounce-based approach (counting empty frames), which fired falsely during natural gaps in chunk delivery, causing premature audio cutoff; (2) our pre-buffer of 150ms was too thin for real-world network jitter. We identified that Sarvam sends a `{"type": "Flushed"}` WebSocket message as the authoritative "all audio sent" signal, and replaced the fragile debounce logic with this event-driven approach. We also increased the pre-buffer to ~200ms for jitter absorption.

### STT Returning Empty Transcripts

Sarvam's speech-to-text service intermittently returned empty transcripts despite receiving valid audio data. Debugging required adding extensive logging: full response body from the API, audio blob sizes before sending, confidence scores, and duration metadata. We also added an explicit `language` parameter to prevent auto-detection failures on short audio clips, since Sarvam's language detection can misidentify brief utterances.

### Stale Closure Bug in Voice Auto-Send

When implementing auto-send (voice transcript automatically sends without pressing the Send button), we hit a classic React stale closure bug. The voice input callback captured a stale version of the `input` state, so `sendMessage()` would send an empty string even though the transcript was visible in the input field. We fixed this by creating `sendMessageDirect(text)` that accepts the transcript as a parameter, bypassing the stale state entirely. `useVoiceInput` stores its callback in a `useRef` that gets updated every render, so the callback always reads the latest function reference.

### Hindi Language Support Complexity

Supporting Hindi required changes across the entire stack: dual system prompt versions (EN + HI files), a separate tool schema with an additional `child_dialogue_devanagari` field, Devanagari-to-romanized-Hindi transliteration after STT (since the LLM works better with romanized input), language-aware intro video resolution with fallback from Hindi to English, and dev tools that support editing both language variants. The transliteration step was particularly tricky. We call Sarvam's `/transliterate` endpoint post-STT to convert Devanagari script to romanized Hindi before passing it to Claude.

### Token Efficiency Across Multi-Exchange Conversations

Each API call to Claude includes the full system prompt (~2K tokens), full conversation history (growing with each exchange), and the tool schema. By exchange 5-6, ~90% of input tokens are identical re-processing. We implemented Anthropic's prompt caching with `cache_control: { type: "ephemeral" }` on the system prompt and the last `tool_result` in message history. This reduced costs by ~90% for cached reads and cut latency noticeably on later exchanges.

---

## 3. Justify Usage of Claude Code and Replit

### Claude Code

Claude Code was the primary development environment for this entire project, covering architecture, implementation, and debugging. Here's specifically how it was used:

**Architecture & Planning:** Every major feature started with Claude Code's planning mode. The implementation plan was designed and executed through Claude Code, with clear phase boundaries, verification steps, and decision logging. At architectural crossroads (like whether to use a separate analysis LLM call or derive scorecard data from interaction history), Claude Code helped us reason through tradeoffs and make documented decisions.

**AI Integration:** We used Claude Code's Context7 MCP to look up current Anthropic SDK documentation before writing every API integration. The child interaction API route (SSE streaming, `tool_use` for structured JSON enforcement, 3x retry with exponential backoff, prompt caching) was built entirely through Claude Code. It understood the nuances of `tool_choice`, `cache_control` placement, and streaming event types because it could reference the latest SDK docs in real-time.

**Frontend Development:** The entire UI (Warm Brutalism design system, three-panel interaction layout, emotional dashboard with animated score bars, brain visualization SVG, scorecard with Recharts emotional arc chart, exchange replay with reveal animations) was built using Claude Code's frontend-design skill. This skill enforced distinctive, non-generic aesthetics (neo-brutalism with thick borders, offset shadows, warm palette) and prevented the UI from looking like generic AI-generated output.

**Parallel Development:** Claude Code's subagent system let us parallelize independent tasks. When building the voice mode overhaul, we dispatched 3 exploration agents simultaneously (scenarios page structure, dev settings, voice route architecture), then dispatched implementation agents in parallel for independent file changes. This dramatically sped up multi-file refactors.

**Debugging:** When we hit the Haiku 4.5 529 errors, Claude Code's systematic debugging skill helped us isolate the issue to `tool_use` + `tool_choice` interactions, implement the retry mechanism, test with Haiku 3, and later upgrade back. The stale closure bug in voice auto-send was similarly diagnosed and fixed through Claude Code's understanding of React hook closure semantics.

**Dev Tools:** The entire `/dev` page (a 5-tab developer dashboard for editing system prompts, scenario configs, LLM parameters, tool schemas, and scorecard insights at runtime) was built through Claude Code. This let us iterate on prompts and configs without code changes or server restarts, which was critical for tuning the child AI's personality during the hackathon.

**Code Quality:** After each major feature, Claude Code's code review agents (code-reviewer, silent-failure-hunter, code-simplifier) audited the changes for bugs, error handling gaps, and unnecessary complexity. The project maintained clean builds throughout development.

### Replit

Replit was used as the deployment and demo platform for the hackathon submission. The project was developed locally with Next.js and deployed to Replit for live demonstration, allowing judges and other participants to interact with Baby AI directly in their browsers without any local setup. Replit's instant deployment made it possible to push updates during the hackathon and have them live immediately for testing and feedback.
