"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Mic, Square, Volume2, VolumeX } from "lucide-react";
import {
  ChildResponse,
  Exchange,
  DevConfig,
  InteractionEnding,
  ScenarioConfig,
  ScorecardEnding,
  ScorecardInsights,
} from "@/lib/types";
import { scenarios } from "@/lib/scenarios";
import {
  resolveIntroPathForLang,
  resolveEmotionImage,
  resolveEmotionVideo,
  type ScenarioAssetManifest,
} from "@/lib/scenario-assets";
import { streamChildResponse } from "@/lib/stream-client";
import { useVoiceInput } from "@/lib/use-sarvam-voice-input";
import { useTts } from "@/lib/use-sarvam-tts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scorecard } from "@/components/scorecard";
import { ScenarioIntro } from "@/components/scenario-intro";

type ScenarioPhase = "loading" | "intro" | "interaction" | "scorecard";

/* ─── SVG fallback face ─── */

function ChildFace({ emotionalState }: { emotionalState: number }) {
  if (emotionalState >= 7) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <circle cx="50" cy="50" r="40" fill="#FFF3E6" stroke="#1A1A1A" strokeWidth="2.5" />
        <circle cx="37" cy="42" r="4" fill="#1A1A1A" />
        <circle cx="63" cy="42" r="4" fill="#1A1A1A" />
        <path d="M 35 60 Q 50 72 65 60" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (emotionalState >= 4) {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full">
        <circle cx="50" cy="50" r="40" fill="#FFF3E6" stroke="#1A1A1A" strokeWidth="2.5" />
        <circle cx="37" cy="42" r="4" fill="#1A1A1A" />
        <circle cx="63" cy="42" r="4" fill="#1A1A1A" />
        <line x1="30" y1="34" x2="40" y2="36" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
        <line x1="70" y1="34" x2="60" y2="36" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
        <path d="M 35 64 Q 50 56 65 64" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <circle cx="50" cy="50" r="40" fill="#FFF3E6" stroke="#1A1A1A" strokeWidth="2.5" />
      <circle cx="37" cy="42" r="4" fill="#1A1A1A" />
      <circle cx="63" cy="42" r="4" fill="#1A1A1A" />
      <line x1="28" y1="32" x2="42" y2="36" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
      <line x1="72" y1="32" x2="58" y2="36" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" />
      <path d="M 35 68 Q 50 56 65 68" fill="none" stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 33 48 Q 31 56 29 60" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 67 48 Q 69 56 71 60" fill="none" stroke="#2563EB" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Small avatar for conversation messages ─── */

function ChildAvatar({
  emotionalState,
  scenarioId,
  manifest,
  size = 40,
}: {
  emotionalState: number;
  scenarioId: string;
  manifest: ScenarioAssetManifest | undefined;
  size?: number;
}) {
  const imagePath = resolveEmotionImage(scenarioId, emotionalState, manifest);

  if (imagePath) {
    return (
      <div
        className="shrink-0 overflow-hidden rounded-full border-2 border-border"
        style={{ width: size, height: size }}
      >
        <Image
          src={imagePath}
          alt="Child"
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="shrink-0 overflow-hidden rounded-full border-2 border-border bg-[#FFF3E6]"
      style={{ width: size, height: size }}
    >
      <ChildFace emotionalState={emotionalState} />
    </div>
  );
}

/* ─── Recording indicator (animated bars) ─── */

function RecordingIndicator() {
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 24 }}>
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-sm bg-main"
          animate={{ height: ["6px", "20px", "6px"] }}
          transition={{
            duration: 0.6 + i * 0.12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.08,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Helpers ─── */

function getDashboardTint(emotionalState: number): string {
  if (emotionalState >= 7) return "bg-dashboard-tint-safe";
  if (emotionalState >= 5) return "bg-dashboard-tint-neutral";
  if (emotionalState >= 3) return "bg-dashboard-tint-tense";
  return "bg-dashboard-tint-crisis";
}

function getEmotionalStateColor(state: number): string {
  if (state >= 7) return "#16A34A";
  if (state >= 4) return "#EAB308";
  return "#DC2626";
}

function getDashboardBg(state: number): string {
  if (state >= 7) return "#F0FDF4";
  if (state >= 5) return "#F5F3F0";
  if (state >= 3) return "#FFF7ED";
  return "#FEF2F2";
}

/* ─── Ending card ─── */

const ENDING_CONFIG: Record<
  string,
  { bg: string; titleColor: string; title: string; getMessage: (name: string) => string }
> = {
  resolution: {
    bg: "bg-success-bg",
    titleColor: "text-success",
    title: "Resolution",
    getMessage: (name) => `${name} has calmed down. Still processing, but no longer in crisis.`,
  },
  meltdown: {
    bg: "bg-danger-bg",
    titleColor: "text-danger",
    title: "Meltdown",
    getMessage: (name) => `${name} is beyond reach. The thinking brain went fully offline.`,
  },
  limbo: {
    bg: "bg-warning-bg",
    titleColor: "text-warning",
    title: "Time's Up",
    getMessage: (name) =>
      `The interaction ended without resolution. ${name} is still upset, but less intense.`,
  },
};

function EndingCard({
  ending,
  childName,
}: {
  ending: string;
  childName: string;
}) {
  const config = ENDING_CONFIG[ending] ?? ENDING_CONFIG.limbo;

  return (
    <Card className={`${config.bg} py-4 shadow-shadow`}>
      <CardContent className="text-center">
        <p className={`font-heading text-lg ${config.titleColor}`}>{config.title}</p>
        <p className="mt-1 text-sm text-text-secondary">{config.getMessage(childName)}</p>
      </CardContent>
    </Card>
  );
}

/* ─── Score bar ─── */

function ScoreBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percentage = (value / max) * 100;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-heading text-text-secondary">{label}</span>
        <span className="font-heading text-foreground">
          {value}/{max}
        </span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-base border-2 border-border bg-secondary-background">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main page content ─── */

function VoicePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const scenarioId = params.id as string;
  const [runtimeScenario, setRuntimeScenario] = useState<ScenarioConfig | null>(null);
  const scenario = runtimeScenario ?? scenarios[scenarioId];

  const initialLang = searchParams.get("lang") === "hi" ? "hi" : "en";

  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [, setStreamingDialogue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [latestResponse, setLatestResponse] = useState<ChildResponse | null>(null);
  const [showFlash, setShowFlash] = useState(false);
  const [maxExchanges, setMaxExchanges] = useState(5);
  const [phase, setPhase] = useState<ScenarioPhase>("loading");
  const [assetManifest, setAssetManifest] = useState<Record<string, ScenarioAssetManifest>>({});
  const [scorecardInsights, setScorecardInsights] = useState<ScorecardInsights | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const language = initialLang as "en" | "hi";
  const tts = useTts(language);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // Send message with explicit text (avoids stale state from voice callback)
  async function sendMessageDirect(message: string) {
    if (!message.trim() || loading) return;
    if (exchanges.length >= maxExchanges) return;

    const parentMessage = message.trim();
    setInput("");
    setError(null);
    setPendingMessage(parentMessage);
    setStreamingDialogue("");
    setLoading(true);

    await streamChildResponse(
      {
        scenario_id: scenarioId,
        parent_message: parentMessage,
        history: exchanges,
        voice_mode: language === "hi" ? "hindi" : "english",
      },
      {
        onJsonDelta() {},
        onDialogueDelta(newText) {
          setStreamingDialogue((prev) => prev + newText);
        },
        onTtsTextReady(text) {
          if (ttsEnabled) tts.speak(text);
        },
        onComplete(data) {
          const response = data as unknown as ChildResponse;
          setLatestResponse(response);
          setShowFlash(true);
          setExchanges((prev) => [
            ...prev,
            { parent_message: parentMessage, child_response: response },
          ]);
          setPendingMessage(null);
          setStreamingDialogue("");
          setLoading(false);
        },
        onError(errMsg) {
          setError(errMsg);
          setPendingMessage(null);
          setStreamingDialogue("");
          setLoading(false);
        },
      },
      language === "hi"
        ? { ttsField: "child_dialogue_devanagari" }
        : { ttsField: "child_dialogue" }
    );
  }

  function sendMessage() {
    sendMessageDirect(input);
  }

  // Voice input with auto-send on transcription complete
  const voice = useVoiceInput((text) => {
    setInput(text);
    sendMessageDirect(text);
  }, language);

  // Unified busy state
  const isBusy =
    loading ||
    voice.isRecording ||
    voice.isTranscribing ||
    tts.isSpeaking ||
    tts.isLoading;

  useEffect(() => {
    fetch("/api/dev/config")
      .then((r) => r.json())
      .then((c: DevConfig) => setMaxExchanges(c.max_exchanges))
      .catch(() => {});
    fetch("/api/dev/scenarios")
      .then((r) => r.json())
      .then((data: Record<string, ScenarioConfig>) => {
        if (data[scenarioId]) setRuntimeScenario(data[scenarioId]);
      })
      .catch(() => {});
    fetch("/api/dev/scorecard-insights")
      .then((r) => r.json())
      .then((data: ScorecardInsights) => setScorecardInsights(data))
      .catch(() => {});
    fetch("/api/dev/assets")
      .then((r) => r.json())
      .then((manifest: Record<string, ScenarioAssetManifest>) => {
        setAssetManifest(manifest);
        const m = manifest[scenarioId];
        if (m?.intro || m?.introHi) {
          setPhase("intro");
        } else {
          setPhase("interaction");
        }
      })
      .catch(() => setPhase("interaction"));
  }, [scenarioId]);

  useEffect(() => {
    if (!loading) {
      inputRef.current?.focus();
    }
  }, [loading]);

  useEffect(() => {
    if (showFlash) {
      const timer = setTimeout(() => setShowFlash(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showFlash]);


  // Auto-transition to scorecard after ending card appears
  useEffect(() => {
    const TERMINAL: InteractionEnding[] = ["resolution", "meltdown"];
    const et = latestResponse?.is_resolved ?? "ongoing";
    const ended = TERMINAL.includes(et) || exchanges.length >= maxExchanges;

    if (ended && !tts.isSpeaking && !tts.isLoading && scorecardInsights) {
      const timer = setTimeout(() => setPhase("scorecard"), 2000);
      return () => clearTimeout(timer);
    }
  }, [latestResponse, exchanges.length, maxExchanges, tts.isSpeaking, tts.isLoading, scorecardInsights]);

  if (!scenario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent>
            <p className="text-lg text-danger">Unknown scenario: {scenarioId}</p>
            <Link href="/scenarios">
              <Button variant="neutral" className="mt-4">
                Back to Scenarios
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentState = {
    emotionalState: latestResponse?.emotional_state ?? scenario.opening_emotional_state,
  };

  const TERMINAL_STATES: InteractionEnding[] = ["resolution", "meltdown"];
  const endingType = latestResponse?.is_resolved ?? "ongoing";
  const isTerminal = TERMINAL_STATES.includes(endingType);
  const isLimbo = !isTerminal && exchanges.length >= maxExchanges;
  const isEnded = isTerminal || isLimbo;
  const scorecardEnding: ScorecardEnding = isLimbo ? "limbo" : (endingType as ScorecardEnding);

  // Derived asset paths
  const introVideoPath = resolveIntroPathForLang(scenarioId, language, assetManifest);
  const emotionImagePath = resolveEmotionImage(scenarioId, currentState.emotionalState, assetManifest[scenarioId]);
  const emotionVideoPath = resolveEmotionVideo(scenarioId, currentState.emotionalState, assetManifest[scenarioId]);

  function handleTryAgain() {
    tts.stop();
    setExchanges([]);
    setLatestResponse(null);
    setPhase("interaction");
    setError(null);
    setInput("");
  }

  const visibleExchanges = exchanges.slice(-3);
  const hasHiddenExchanges = exchanges.length > 3;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ── Top bar ── */}
      <div className="border-b-2 border-border bg-secondary-background px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link href="/scenarios">
            <Button variant="neutral" size="sm">
              &larr; Back
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="font-heading text-lg">{scenario.title}</h1>
            <p className="text-xs text-text-secondary">{scenario.description}</p>
          </div>
          <div className="flex items-center gap-2">
            {phase !== "intro" && (
              <>
                <Button
                  variant="neutral"
                  size="icon"
                  onClick={() => {
                    if (ttsEnabled) tts.stop();
                    setTtsEnabled((prev) => !prev);
                  }}
                >
                  {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* ── Intro phase ── */}
        {phase === "intro" && introVideoPath && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
            className="flex flex-1 items-center justify-center p-8"
          >
            <ScenarioIntro
              videoPath={introVideoPath}
              scenario={scenario}
              onComplete={() => setPhase("interaction")}
            />
          </motion.div>
        )}

        {/* ── Scorecard phase ── */}
        {phase === "scorecard" && scorecardInsights && (
          <motion.div
            key="scorecard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex-1 overflow-y-auto p-4"
          >
            <Scorecard
              exchanges={exchanges}
              scenario={scenario}
              ending={scorecardEnding}
              insights={scorecardInsights}
              language={language}
              onTryAgain={handleTryAgain}
            />
          </motion.div>
        )}

        {/* ── Interaction phase (40/60 layout) ── */}
        {phase === "interaction" && (
          <motion.div
            key="interaction"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mx-auto flex w-full max-w-7xl flex-1 gap-6 p-4"
          >
            {/* ── Left: Avatar panel (40%) ── */}
            <div className="flex w-[40%] shrink-0 flex-col">
              <motion.div
                animate={{ backgroundColor: getDashboardBg(currentState.emotionalState) }}
                transition={{ duration: 0.6 }}
                className="flex flex-1 flex-col rounded-base border-2 border-border"
              >
                <Card
                  className={`flex-1 gap-0 border-0 py-4 shadow-none ${getDashboardTint(currentState.emotionalState)}`}
                >
                  <CardContent className="flex flex-1 flex-col items-center justify-center space-y-4">
                    {/* Large avatar area */}
                    <div className="relative aspect-square w-full max-w-[400px] overflow-hidden rounded-base border-2 border-border">
                      <AnimatePresence mode="wait">
                        {tts.isSpeaking && emotionVideoPath ? (
                          <motion.div
                            key={`video-${emotionVideoPath}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="absolute inset-0"
                          >
                            <video
                              src={emotionVideoPath}
                              autoPlay
                              loop
                              muted
                              playsInline
                              className="h-full w-full object-cover"
                            />
                          </motion.div>
                        ) : emotionImagePath ? (
                          <motion.div
                            key={`image-${emotionImagePath}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="relative h-full w-full"
                          >
                            <Image
                              src={emotionImagePath}
                              alt="Child"
                              fill
                              className="object-cover"
                              sizes="400px"
                            />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="face"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex h-full w-full items-center justify-center bg-[#FFF3E6]"
                          >
                            <div className="w-3/4">
                              <ChildFace emotionalState={currentState.emotionalState} />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* State bar + exchange counter (no heading) */}
                    <div className="w-full max-w-[400px]">
                      <ScoreBar
                        label="Emotional State"
                        value={currentState.emotionalState}
                        max={10}
                        color={getEmotionalStateColor(currentState.emotionalState)}
                      />
                      <p className="mt-2 text-center text-xs text-text-secondary">
                        Exchange:{" "}
                        {exchanges.length === 0
                          ? "Opening"
                          : `${exchanges.length} / ${maxExchanges}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* ── Right: Conversation panel (60%) ── */}
            <div className="flex w-[60%] flex-col">
              <div className="relative flex-1 space-y-3 overflow-y-auto pb-4">
                {/* Opening line */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-start gap-3">
                    <ChildAvatar
                      emotionalState={scenario.opening_emotional_state}
                      scenarioId={scenarioId}
                      manifest={assetManifest[scenarioId]}
                    />
                    <Card className="flex-1 gap-2 border-l-[3px] border-l-child-accent bg-child-bg py-3 shadow-none">
                      <CardContent>
                        <p className="text-xs font-bold uppercase tracking-wider text-child-accent">
                          {scenario.child_name}
                        </p>
                        <p className="mt-1 text-lg">{language === "hi" ? scenario.opening_line_hindi : scenario.opening_line}</p>
                      </CardContent>
                    </Card>
                  </div>
                </motion.div>

                {/* Hidden exchanges indicator */}
                {hasHiddenExchanges && (
                  <div className="flex items-center gap-2 px-4 py-1">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-xs text-text-muted">
                      {exchanges.length - 3} earlier exchange
                      {exchanges.length - 3 > 1 ? "s" : ""}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}

                {/* Visible exchanges */}
                <AnimatePresence mode="popLayout">
                  {visibleExchanges.map((exchange, i) => {
                    const globalIndex = exchanges.length - visibleExchanges.length + i;
                    return (
                      <motion.div
                        key={`exchange-${globalIndex}`}
                        initial={
                          globalIndex === exchanges.length - 1 && !loading
                            ? false
                            : { opacity: 0, y: 20 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3, delay: 0.05 }}
                        className="space-y-3"
                      >
                        {/* Parent message */}
                        <Card className="gap-2 border-l-[3px] border-l-parent-accent bg-parent-bg py-3 shadow-none">
                          <CardContent>
                            <p className="text-xs font-bold uppercase tracking-wider text-parent-accent">
                              You
                            </p>
                            <p className="mt-1 text-base">{exchange.parent_message}</p>
                          </CardContent>
                        </Card>

                        {/* Child response */}
                        <div className="flex items-start gap-3">
                          <ChildAvatar
                            emotionalState={exchange.child_response.emotional_state}
                            scenarioId={scenarioId}
                            manifest={assetManifest[scenarioId]}
                          />
                          <Card className="flex-1 gap-2 border-l-[3px] border-l-child-accent bg-child-bg py-3 shadow-none">
                            <CardContent>
                              <p className="text-xs font-bold uppercase tracking-wider text-child-accent">
                                {scenario.child_name}
                              </p>
                              <p className="mt-1 text-lg">
                                {exchange.child_response.child_dialogue}
                              </p>
                            </CardContent>
                          </Card>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {/* Pending parent message + streaming child response */}
                {pendingMessage && (
                  <div className="space-y-3">
                    <Card className="gap-2 border-l-[3px] border-l-parent-accent bg-parent-bg py-3 shadow-none">
                      <CardContent>
                        <p className="text-xs font-bold uppercase tracking-wider text-parent-accent">
                          You
                        </p>
                        <p className="mt-1 text-base">{pendingMessage}</p>
                      </CardContent>
                    </Card>

                    <div className="flex items-start gap-3">
                      <ChildAvatar
                        emotionalState={currentState.emotionalState}
                        scenarioId={scenarioId}
                        manifest={assetManifest[scenarioId]}
                      />
                      <Card className="flex-1 gap-2 border-l-[3px] border-l-child-accent bg-child-bg py-3 shadow-none">
                        <CardContent>
                          <p className="text-xs font-bold uppercase tracking-wider text-child-accent">
                            {scenario.child_name}
                          </p>
                          <motion.p
                            className="mt-1 text-lg text-text-muted"
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ repeat: Infinity, duration: 1.4 }}
                          >
                            ...
                          </motion.p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <Card className="bg-danger-bg py-3 shadow-none">
                    <CardContent>
                      <p className="text-sm text-danger">{error}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Ending cards */}
                <AnimatePresence>
                  {isEnded && !tts.isSpeaking && !tts.isLoading && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <EndingCard
                        ending={isLimbo ? "limbo" : endingType}
                        childName={scenario.child_name}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Input area ── */}
              {!isEnded && (
                <div className="space-y-2 border-t-2 border-border pt-4">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      sendMessage();
                    }}
                    className="flex items-center gap-2"
                  >
                    <Input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={
                        tts.isSpeaking || tts.isLoading
                          ? "Listening to child..."
                          : voice.isRecording
                            ? "Recording..."
                            : voice.isTranscribing
                              ? "Transcribing..."
                              : "How do you respond?"
                      }
                      disabled={isBusy}
                      className="flex-1"
                    />
                    {voice.isRecording && <RecordingIndicator />}
                    {voice.isSupported && (
                      <Button
                        type="button"
                        onClick={() =>
                          voice.isRecording
                            ? voice.stopRecording()
                            : voice.startRecording()
                        }
                        disabled={loading || voice.isTranscribing || tts.isSpeaking || tts.isLoading}
                        variant={voice.isRecording ? "default" : "neutral"}
                        size="icon"
                      >
                        {voice.isRecording ? (
                          <Square className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={isBusy || !input.trim()}
                      variant="default"
                    >
                      Send
                    </Button>
                  </form>
                  {voice.error && (
                    <p className="text-sm text-danger">{voice.error}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page export with Suspense for useSearchParams ─── */

export default function ScenarioPage() {
  return (
    <Suspense>
      <VoicePageInner />
    </Suspense>
  );
}
