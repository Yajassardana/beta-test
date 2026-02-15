"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Mic, Square, Volume2, VolumeX } from "lucide-react";
import { ChildResponse, Exchange, DevConfig, InteractionEnding, ScorecardEnding, ScorecardInsights } from "@/lib/types";
import { scenarios } from "@/lib/scenarios";
import Image from "next/image";
import { resolveIntroPath, resolveEmotionImage, type ScenarioAssetManifest } from "@/lib/scenario-assets";
import { streamChildResponse } from "@/lib/stream-client";
import { useVoiceInput } from "@/lib/use-voice-input";
import { useTts } from "@/lib/use-tts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Scorecard } from "@/components/scorecard";
import { ScenarioIntro } from "@/components/scenario-intro";

type ScenarioPhase = "loading" | "intro" | "interaction" | "scorecard";

function ChildFace({ emotionalState }: { emotionalState: number }) {
  if (emotionalState >= 7) {
    // Calm face - slight smile
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
    // Worried face
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
  // Upset/crying face
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

export default function ScenarioPage() {
  const params = useParams();
  const scenarioId = params.id as string;
  const scenario = scenarios[scenarioId];

  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [streamingDialogue, setStreamingDialogue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [latestResponse, setLatestResponse] = useState<ChildResponse | null>(
    null
  );
  const [showFlash, setShowFlash] = useState(false);
  const [maxExchanges, setMaxExchanges] = useState(5);
  const [introVideoPath, setIntroVideoPath] = useState<string | null>(null);
  const [phase, setPhase] = useState<ScenarioPhase>("loading");
  const [assetManifest, setAssetManifest] = useState<Record<string, ScenarioAssetManifest>>({});
  const [scorecardInsights, setScorecardInsights] = useState<ScorecardInsights | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput((text) => setInput(text));
  const tts = useTts();
  const [ttsEnabled, setTtsEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/dev/config")
      .then((r) => r.json())
      .then((c: DevConfig) => setMaxExchanges(c.max_exchanges))
      .catch(() => {});
    fetch("/api/dev/scorecard-insights")
      .then((r) => r.json())
      .then((data: ScorecardInsights) => setScorecardInsights(data))
      .catch(() => {});
    fetch("/api/dev/assets")
      .then((r) => r.json())
      .then((manifest: Record<string, ScenarioAssetManifest>) => {
        setAssetManifest(manifest);
        const videoPath = resolveIntroPath(scenarioId, manifest);
        if (videoPath) {
          setIntroVideoPath(videoPath);
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

  if (!scenario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent>
            <p className="text-lg text-danger">
              Unknown scenario: {scenarioId}
            </p>
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

  async function sendMessage() {
    if (!input.trim() || loading) return;
    if (exchanges.length >= maxExchanges) return;

    const parentMessage = input.trim();
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
      },
      {
        onJsonDelta() {},
        onDialogueDelta(newText) {
          setStreamingDialogue((prev) => prev + newText);
        },
        onDialogueComplete(text) {
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
        onError(message) {
          setError(message);
          setPendingMessage(null);
          setStreamingDialogue("");
          setLoading(false);
        },
      }
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

  function handleTryAgain() {
    tts.stop();
    setExchanges([]);
    setLatestResponse(null);
    setPhase("interaction");
    setError(null);
    setInput("");
  }

  // Show only last 3 exchanges in screenplay format
  const visibleExchanges = exchanges.slice(-3);
  const hasHiddenExchanges = exchanges.length > 3;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
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
          <div className="flex w-20 justify-end">
            {phase !== "intro" && (
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
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
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
              onTryAgain={handleTryAgain}
            />
          </motion.div>
        )}

        {phase === "interaction" && (
          <motion.div
            key="interaction"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="mx-auto flex w-full max-w-6xl flex-1 gap-4 p-4"
          >

        {/* Conversation panel */}
        <div className="flex min-w-0 flex-1 flex-col">
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
                    <p className="mt-1 text-lg">{scenario.opening_line}</p>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            {/* Hidden exchanges indicator */}
            {hasHiddenExchanges && (
              <div className="flex items-center gap-2 px-4 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-text-muted">
                  {exchanges.length - 3} earlier exchange{exchanges.length - 3 > 1 ? "s" : ""}
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
                    initial={globalIndex === exchanges.length - 1 && !loading
                      ? false
                      : { opacity: 0, y: 20 }}
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

            {/* Pending parent message + loading child response */}
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
                      {streamingDialogue ? (
                        <p className="mt-1 text-lg">{streamingDialogue}</p>
                      ) : (
                        <motion.p
                          className="mt-1 text-lg text-text-muted"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ repeat: Infinity, duration: 1.4 }}
                        >
                          ...
                        </motion.p>
                      )}
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
              {isEnded && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                >
                  <EndingCard
                    ending={isLimbo ? "limbo" : endingType}
                    childName={scenario.child_name}
                    onShowScorecard={
                      scorecardInsights
                        ? () => setPhase("scorecard")
                        : undefined
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input area */}
          {!isEnded && (
            <div className="border-t-2 border-border pt-4 space-y-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    voice.isRecording
                      ? "Recording..."
                      : voice.isTranscribing
                        ? "Transcribing..."
                        : "How do you respond?"
                  }
                  disabled={loading || voice.isRecording || voice.isTranscribing}
                  className="flex-1"
                />
                {voice.isSupported && (
                  <Button
                    type="button"
                    onClick={() =>
                      voice.isRecording
                        ? voice.stopRecording()
                        : voice.startRecording()
                    }
                    disabled={loading || voice.isTranscribing}
                    variant={voice.isRecording ? "default" : "neutral"}
                    size="icon"
                    className={voice.isRecording ? "animate-pulse" : ""}
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
                  disabled={loading || !input.trim() || voice.isRecording || voice.isTranscribing}
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

        {/* Right panel - Emotional Dashboard */}
        <div className="w-[260px] shrink-0">
          <motion.div
            animate={{
              backgroundColor:
                currentState.emotionalState >= 7
                  ? "#F0FDF4"
                  : currentState.emotionalState >= 5
                    ? "#F5F3F0"
                    : currentState.emotionalState >= 3
                      ? "#FFF7ED"
                      : "#FEF2F2",
            }}
            transition={{ duration: 0.6 }}
          >
            <Card
              className={`gap-4 py-4 ${getDashboardTint(currentState.emotionalState)}`}
            >
              <CardHeader>
                <CardTitle className="text-base">Emotional State</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {(() => {
                  const imgPath = resolveEmotionImage(scenarioId, currentState.emotionalState, assetManifest[scenarioId]);
                  if (!imgPath) return null;
                  return (
                    <div className="relative aspect-square w-full overflow-hidden rounded-base border-2 border-border">
                      <Image
                        src={imgPath}
                        alt="Child"
                        fill
                        className="object-cover"
                        sizes="260px"
                      />
                    </div>
                  );
                })()}
                <ScoreBar
                  label="Emotional State"
                  value={currentState.emotionalState}
                  max={10}
                  color={getEmotionalStateColor(currentState.emotionalState)}
                />
                <p className="text-xs text-text-secondary">
                  Exchange: {exchanges.length === 0
                    ? "Opening"
                    : `${exchanges.length} / ${maxExchanges}`}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

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
  onShowScorecard,
}: {
  ending: string;
  childName: string;
  onShowScorecard?: () => void;
}) {
  const config = ENDING_CONFIG[ending] ?? ENDING_CONFIG.limbo;

  return (
    <Card className={`${config.bg} py-4 shadow-shadow`}>
      <CardContent className="text-center">
        <p className={`font-heading text-lg ${config.titleColor}`}>{config.title}</p>
        <p className="mt-1 text-sm text-text-secondary">{config.getMessage(childName)}</p>
        <div className="mt-4 flex items-center justify-center gap-3">
          {onShowScorecard && (
            <Button variant="default" onClick={onShowScorecard}>
              See What Happened
            </Button>
          )}
          <Link href="/scenarios">
            <Button variant="neutral">Back to Scenarios</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

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
