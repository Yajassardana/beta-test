"use client";

import { motion } from "motion/react";
import { Exchange, ScenarioConfig } from "@/lib/types";
import { ExchangeDelta } from "@/lib/scorecard-utils";

interface ExchangeReplayProps {
  exchanges: Exchange[];
  scenario: ScenarioConfig;
  deltas: ExchangeDelta[];
  language: "en" | "hi";
}

function TrackBadge({ delta }: { delta: number }) {
  const isGood = delta >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 px-2 py-0.5 text-[10px] font-heading ${
        isGood
          ? "border-success/40 bg-success-bg text-success"
          : "border-danger/40 bg-danger-bg text-danger"
      }`}
    >
      {isGood ? (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="2,6 5,9 10,3" />
        </svg>
      ) : (
        <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="3" y1="3" x2="9" y2="9" />
          <line x1="9" y1="3" x2="3" y2="9" />
        </svg>
      )}
      {delta >= 0 ? "+" : ""}{delta}
    </span>
  );
}

export function ExchangeReplay({
  exchanges,
  scenario,
  deltas,
  language,
}: ExchangeReplayProps) {
  const STAGGER_BASE = 1.6;
  const STAGGER_STEP = 0.5;

  return (
    <div className="space-y-3">
      <h3 className="font-heading text-base">Replay</h3>

      <div className="space-y-3 rounded-base border-2 border-border bg-secondary-background p-4">
        {/* Opening line -- child speaks first */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0 }}
          className="mr-auto max-w-[80%]"
        >
          <div className="rounded-2xl rounded-tl-sm border-2 border-border bg-child-bg px-4 py-2.5 shadow-[2px_2px_0px_0px_var(--border)]">
            <p className="text-[10px] font-heading uppercase tracking-wider text-child-accent">
              {scenario.child_name}
            </p>
            <p className="mt-1 text-sm leading-relaxed">
              {language === "hi" ? scenario.opening_line_hindi : scenario.opening_line}
            </p>
          </div>
        </motion.div>

        {/* Exchange messages */}
        {exchanges.map((exchange, i) => {
          const delta = deltas[i]?.emotionalStateDelta ?? 0;
          const baseDelay = (i + 1) * STAGGER_BASE;

          return (
            <div key={i} className="space-y-3">
              {/* Parent message -- right aligned */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: baseDelay }}
                className="ml-auto max-w-[80%]"
              >
                <div className="rounded-2xl rounded-tr-sm border-2 border-border bg-parent-bg px-4 py-2.5 shadow-[2px_2px_0px_0px_var(--border)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-heading uppercase tracking-wider text-parent-accent">
                      You
                    </p>
                    <TrackBadge delta={delta} />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed">
                    {exchange.parent_message}
                  </p>
                </div>
              </motion.div>

              {/* What they heard -- centered annotation */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: baseDelay + STAGGER_STEP }}
                className="mx-auto max-w-[90%]"
              >
                <div className="relative overflow-hidden rounded-base border-2 border-border bg-foreground px-4 py-3">
                  <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent, transparent 8px, currentColor 8px, currentColor 9px)",
                    }}
                  />
                  <p className="relative text-[10px] font-heading uppercase tracking-widest text-warning">
                    What they actually heard
                  </p>
                  <p className="relative mt-1.5 text-sm font-heading leading-relaxed text-secondary-background">
                    &ldquo;{exchange.child_response.what_child_heard}&rdquo;
                  </p>
                </div>
              </motion.div>

              {/* Child response -- left aligned */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.7,
                  delay: baseDelay + STAGGER_STEP * 2,
                }}
                className="mr-auto max-w-[80%]"
              >
                <div className="rounded-2xl rounded-tl-sm border-2 border-border bg-child-bg px-4 py-2.5 shadow-[2px_2px_0px_0px_var(--border)]">
                  <p className="text-[10px] font-heading uppercase tracking-wider text-child-accent">
                    {scenario.child_name}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">
                    {exchange.child_response.child_dialogue}
                  </p>
                  <p className="mt-1.5 text-[11px] italic text-text-muted">
                    {exchange.child_response.child_inner_feeling}
                  </p>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
