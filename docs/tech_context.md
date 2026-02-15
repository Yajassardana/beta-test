# Baby AI — Technical Scope Document

## Document Purpose

This document captures the technical architecture and implementation details for Baby AI. For product context, scenarios, design principles, and feature scope, see the companion `BABY_AI_PRODUCT.md` document. For the broader thesis, see `Hackathon_Thesis`.

---

## 1. Tech Stack

```
FRONTEND
├── Next.js (App Router)
├── Framer Motion (all animations — scenario cards, transitions, dashboards)
├── Recharts (scorecard charts — emotional arc)
├── Tailwind CSS (styling)
├── Web Audio API (mic waveform visualization + voice tone feature extraction)
└── Web Speech API (speech-to-text for parent input; fallback: Deepgram)

BACKEND (Next.js API routes)
├── /api/child-respond  → Claude Haiku (scenario-specific system prompt)
├── /api/speak          → ElevenLabs TTS API (child's voice)
└── /api/analyze        → Claude Haiku (analysis system prompt, different from child)

EXTERNAL APIS
├── Anthropic Claude Haiku — Child AI persona + post-interaction analysis
└── ElevenLabs — Text-to-speech for child's voice (+ pre-generated narration)
```

---

## 2. Static Assets (Pre-Generated, Not Runtime)

```
/scenarios
├── scenario-1-toy-store/
│   ├── illustration.png       — AI-generated scene (Midjourney/DALL-E/Flux)
│   ├── narration.mp3          — Voiceover reading scenario setup (ElevenLabs)
│   ├── opening-line.mp3       — Child's first line pre-generated for instant playback
│   ├── key-insight.md         — Pre-written scenario-specific insight for scorecard
│   └── config.json            — System prompt, child name/age, scenario metadata
├── scenario-2-im-stupid/
├── scenario-3-i-hate-you/
└── scenario-4-the-lie/

/child-expressions
├── angry.png (or SVG)
├── crying.png
├── testing.png
├── softening.png
├── happy.png
└── withdrawn.png
```

---

## 3. API Call Flow (Single Exchange)

```
1. User presses mic button
2. Web Speech API captures speech → transcript
3. Web Audio API extracts voice features (IN PARALLEL with STT):
   - Average volume (RMS)
   - Volume trajectory (getting louder?)
   - Speech rate (words per second)
   - Pause ratio (measured or reactive?)
4. Frontend sends POST /api/child-respond:
   {
     scenario_id: "toy-store",
     history: [...previous exchanges...],
     parent_message: "Stop crying right now!",
     voice_metadata: {
       average_volume: 0.8,
       volume_trend: "increasing",
       speech_pace: "fast",
       pause_ratio: 0.1
     }
   }
5. API route loads system prompt for scenario
6. Calls Claude Haiku → structured JSON response
7. PARALLEL: sends child_dialogue to ElevenLabs TTS → audio stream
8. Frontend receives JSON + audio
9. Updates: dashboard scores, brain visualization, child expression
10. Plays child's voice audio
11. Shows "What You Said vs. What They Heard" flash (2 sec)
12. Waits for next parent input
13. When is_resolved: true OR exchange_count >= max → trigger analysis
```

---

## 4. Child LLM Response Schema

Every child LLM call returns this JSON:

```json
{
  "child_dialogue": "The actual words the child says out loud",
  "child_inner_feeling": "What the child is actually feeling but can't articulate (1 sentence, for adult understanding)",
  "emotional_safety_score": 35,
  "connection_score": 25,
  "intensity": 8,
  "what_child_heard": "The meaning the child extracted from the parent's words (1 sentence)",
  "parent_approach_tag": "threatening|logical|dismissive|validating|fantasy|bargaining|guilt-tripping|empathetic",
  "is_resolved": false,
  "exchange_number": 2
}
```

---

## 5. System Prompt Architecture for Child AI

Each scenario has its own complete system prompt (not a shared base + modifier). Each prompt contains 5 sections:

### Section 1: Identity

- Who the child is (name, age, how they speak)
- Language patterns (short sentences, grammatical errors, dramatic, repetitive when upset, Hindi-English mix)
- Explicit instruction: NOT an AI, NOT complex vocabulary

### Section 2: Scenario and Starting Emotional State

- What happened, what the child wants, initial emotion
- Starting intensity level
- What the child believes ("Papa doesn't understand")

### Section 3: Reaction Rules (Natural Language State Machine)

- IF parent uses logic/reasoning → ESCALATE (logic doesn't work on an emotionally flooded child)
- IF parent uses threats/anger → ESCALATE dramatically OR shut down (the silence is NOT resolution)
- IF parent validates feelings → Don't immediately calm down. Be suspicious. Test. But soften slightly.
- IF parent uses the AHA technique (e.g., fantasy) → Surprised, then engage. Significant de-escalation.
- IF parent is harsh/physical threat → Silent compliance. Fear, not resolution.
- CRITICAL: Respond to TONE metadata, not just words. If words are nice but tone is tense, react to the tone.

### Section 4: Conversation Arc and Pacing

- EARLY (exchanges 1-2): Thick of it. Emotional, repetitive, hard to reach. Test the parent. Push back even on good responses.
- MIDDLE (exchanges 3-4): Reflects accumulated approach. Softening if empathetic pattern. Meltdown or shutdown if harsh pattern.
- LATE (exchanges 5-6): Resolution OR breakdown. Good path = still sad but no longer in tantrum, moves to negotiation. Bad path = full meltdown or silent compliance.
- CRITICAL: Do NOT resolve too easily. Even perfect responses require 2-3 consecutive good exchanges to produce resolution. You are a real child, not a teaching tool.

### Section 5: Output Format

- Structured JSON as defined in Section 4 of this document
- ONLY valid JSON, no other text

---

## 6. Analysis LLM (Post-Interaction)

Separate system prompt. NOT the same persona as the child. This is an expert analyst.

**Input:** Full conversation transcript (all exchanges with parent messages, child responses, scores, approach tags, voice metadata)

**Output:** Scorecard data including:

- Per-exchange analysis (what worked, what didn't, why)
- Emotional arc data points
- Highlight moment (best or worst thing said)
- Overall approach assessment
- One specific actionable learning

**Tone instruction:** Warm, not clinical. Insightful, not judgmental. Honor the fact that this person voluntarily put themselves through an uncomfortable experience to be a better parent.

---

## 7. Session Pattern Analysis LLM (After 2-3 scenarios)

**Input:** Transcripts from ALL scenarios played in the session

**Output:**

- 2-3 recurring cross-scenario patterns (not per-scenario, but patterns)
- For each pattern: name it, normalize it ("this is common in..."), explain why
- One genuinely good moment highlighted
- Parenting Style Under Stress type (The Negotiator, The Protector, The Commander, The Empath, etc.)
- One specific actionable thing to try differently

---

## 8. Voice Architecture

### Child Voice (Text-to-Speech)

- **Service:** ElevenLabs TTS API (`/v1/text-to-speech/{voice_id}`)
- **Voice:** Select child-like voice from ElevenLabs voice library (one voice per child character)
- **Emotional modulation:** Adjust `stability` parameter per-call based on `intensity` score from child LLM. Low stability = more emotional variation (tantrums). Higher stability = calmer moments.
- **Streaming:** Use ElevenLabs streaming endpoint — first audio chunks play while rest generates (cuts perceived latency)
- **Pre-generation:** Opening lines and scenario narrations are pre-generated and cached for instant playback
- **Format:** MP3, played via HTMLAudioElement in browser

### Parent Voice (Speech-to-Text)

- **Primary:** Web Speech API (`webkitSpeechRecognition`) — free, zero dependency, works in Chrome
- **Language:** Set to `en-IN` (Indian English) for better accent recognition
- **Fallback:** Deepgram API if Web Speech API is unreliable in testing
- **Interaction model:** Push-to-talk (press mic button to start, release or auto-stop on silence)

### Voice Tone Analysis

- **Method:** Web Audio API extracts features from mic input IN PARALLEL with STT
- **Features extracted per utterance:**
  - `avgVolume` — RMS amplitude (are they shouting?)
  - `volumeTrajectory` — trend over the utterance (getting louder = losing patience)
  - `speechRate` — words per second from transcript/duration (rushed = tense)
  - `pauseRatio` — silence duration / total duration (pauses = thoughtful, positive signal)
- **Usage:** Passed as `voice_metadata` alongside transcript to child LLM
- **Child LLM reacts to tone:** If words are gentle but tone metadata shows high volume + fast pace, child reacts to the TONE (e.g., "Then why are you YELLING?")
- **Scorecard display:** Per-exchange tone indicator (🗣️ Loud, Fast → Child felt threatened)
- **Demo moment:** Parent says the "right" words with wrong tone. Child still escalates. Dashboard shows: "Words: empathetic. Tone: tense. The child responded to your tone. Children under 8 process tone before language."

### Voice Tone Extraction Code Reference

```javascript
// While parent is speaking, capture audio features:
const audioContext = new AudioContext();
const analyser = audioContext.createAnalyser();
const source = audioContext.createMediaStreamSource(micStream);
source.connect(analyser);

// Extract per utterance:
const features = {
  avgVolume: calculateRMS(dataArray),
  volumeTrajectory: getVolumeTrend(),
  speechRate: wordsPerSecond(transcript, duration),
  pauseRatio: silenceDuration / totalDuration,
};
```

### Web Speech API Reference

```javascript
const recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = true;
recognition.lang = "en-IN"; // Indian English

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  // Send to child LLM
};
```

---

## 9. Brain Visualization Component

SVG of a child's head in side profile with two highlighted regions. Driven by `emotional_safety_score` from child LLM response.

```jsx
const BrainViz = ({ safetyScore }) => {
  const thinkingOpacity = safetyScore / 100;
  const survivalOpacity = 1 - safetyScore / 100;
  const survivalPulse = safetyScore < 30;

  return (
    <svg viewBox="0 0 200 200">
      {/* Child head silhouette */}
      <path d="..." fill="#f5e6d3" />

      {/* Prefrontal cortex - "Thinking Brain" */}
      <ellipse
        cx="60"
        cy="80"
        rx="25"
        ry="20"
        fill="#4ade80"
        opacity={thinkingOpacity}
        className="transition-all duration-1000"
      />
      <text x="60" y="115" textAnchor="middle" fontSize="8">
        Thinking Brain
      </text>

      {/* Amygdala - "Survival Brain" */}
      <ellipse
        cx="100"
        cy="90"
        rx="15"
        ry="15"
        fill="#ef4444"
        opacity={survivalOpacity}
        className={`transition-all duration-1000
          ${survivalPulse ? "animate-pulse" : ""}`}
      />
      <text x="100" y="115" textAnchor="middle" fontSize="8">
        Survival Brain
      </text>
    </svg>
  );
};
```

Brain state insight text driven by safety score:

- Safety < 30: "Child's thinking brain is offline. They cannot process logic right now."
- Safety 30-60: "Child is partially receptive. They're watching to see if you're safe."
- Safety > 60: "Child's thinking brain is active. They can hear you and cooperate."

---

## 10. Scenario Card Animation Reference

Each scenario card uses: static AI-generated illustration + Ken Burns effect (CSS transform slow zoom) + staggered text reveal + pre-generated voiceover narration.

```jsx
// Framer Motion staggered text reveal
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: {},
    visible: { transition: { staggerChildren: 0.3 } },
  }}
>
  {scenarioLines.map((line, i) => (
    <motion.p
      key={i}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      {line}
    </motion.p>
  ))}
</motion.div>
```

Transition into interaction: illustrated scene blurs or darkens, interaction UI slides up over it.

---

## 11. "What You Said vs. What They Heard" Flash

After each exchange during interaction, a brief 2-second overlay:

```
┌────────────────────┬────────────────────────┐
│                    │                          │
│   WHAT YOU SAID:   │   WHAT CHILD HEARD:      │
│                    │                          │
│   "Fine, I'll buy  │   "If I cry hard enough, │
│    it. Just stop    │    I get what I want.    │
│    embarrassing     │    Also, my feelings     │
│    me."             │    embarrass my parent." │
│                    │                          │
└────────────────────┴────────────────────────┘
```

Use Framer Motion `AnimatePresence` for enter/exit animation. This briefly interrupts the flow intentionally — forces the user and audience to confront the gap.

Also appears as a full replay in the scorecard (Phase 3 of session flow) with color-coded cards: red border for harmful, yellow for neutral, green for helpful.

---

## 12. Implementation Order

Sequenced by dependency and priority. No day-based breakdown — build in this order:

1. Next.js project setup with Tailwind + Framer Motion
2. API route: `/api/child-respond` (Claude Haiku integration)
3. System prompt for first scenario (Toy Store Meltdown)
4. Basic interaction flow: text input → child response → display (text-only first)
5. Structured JSON parsing and basic dashboard display (safety score, connection score)
6. Add Web Speech API (STT) for parent voice input
7. Add ElevenLabs TTS for child voice output
8. Test one full scenario end-to-end with voice
9. Build brain visualization SVG component
10. Build "What You Said vs. What They Heard" flash overlay
11. Voice tone analysis (Web Audio API feature extraction + pass to child LLM)
12. Build scenario card animation (Ken Burns + staggered text + voiceover)
13. Pre-generate static assets (illustrations, narration audio, opening lines)
14. Add remaining scenario system prompts (I'm Stupid, I Hate You, The Lie)
15. Build API route: `/api/analyze` with separate analysis system prompt
16. Build scorecard: emotional arc chart + exchange-by-exchange replay + key insight
17. Pre-write key insights for each scenario
18. Per-exchange tone indicator in scorecard
19. Session-end pattern analysis (cross-scenario) + parenting style type
20. Transition animations and overall visual polish
21. Test full demo flow end-to-end multiple times

---

## 13. Critical Implementation Notes

### On Character Adherence

- For a 2-3 minute / 4-6 exchange interaction, a well-crafted system prompt will hold character. Context window drift is not a concern at this length.
- The one-shot examples in the system prompt are MORE important than the persona description — they set tone and texture.
- Key instruction to prevent the LLM from being too cooperative: **"You are a real child, not a teaching tool. Do not make it easy for the parent. Do not soften faster than a real child would."**
- The LLM manages its own emotional state through conversation history (no external state machine needed). Each call receives the full history.
- The full conversation history IS the state. No external state tracking needed.

### On Latency

- Child LLM call and ElevenLabs TTS call should run in PARALLEL (call TTS as soon as you have child_dialogue text). Saves 500ms-1s.
- Pre-generate opening lines — don't make the user wait for TTS on the first exchange.
- Use ElevenLabs streaming endpoint — audio starts playing before full generation completes.

### On Scenario System Prompts

- Each scenario gets its own complete system prompt (not a shared base + modifier)
- Each prompt contains: identity, scenario context, reaction rules, pacing rules, output format
- The reaction rules section is the heart — it maps parent behaviors to child reactions in natural language
- Include 2-3 example exchanges in each prompt to set the tone
- Voice tone metadata must be referenced in the prompt: instruct the child to respond to tone, not just words

### On the Analysis Call

- Completely separate system prompt from the child AI
- Must NOT feel like the same "person" evaluating — it's an expert analyst, warm but professional
- Receives the full transcript including all voice_metadata and scores
- The analysis call runs after the interaction ends — a brief loading state ("Analyzing your interaction...") is expected

### On Voice Tone Analysis

- This is the key technical differentiator for the hackathon demo
- The moment where the parent says the "right" words but the child reacts to the tense tone is a planned demo highlight
- Even basic feature extraction (volume + pace) creates a meaningful signal — don't over-engineer this
- The child LLM prompt must explicitly reference voice_metadata and explain how to interpret it

---

_Document created: February 2026 — Anthropic Hackathon_
_For product context and scenarios, see BABY_AI_PRODUCT.md_
