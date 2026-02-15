"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Exchange,
  ScenarioConfig,
  ScorecardEnding,
  ScorecardInsights,
} from "@/lib/types";
import {
  buildChartData,
  computeExchangeDeltas,
} from "@/lib/scorecard-utils";
import { EmotionalArcChart } from "./emotional-arc-chart";
import { ExchangeReplay } from "./exchange-replay";
import { TechniqueCard } from "./technique-card";

const ENDING_BANNER: Record<
  ScorecardEnding,
  { label: string; color: string; bg: string }
> = {
  resolution: { label: "Resolution", color: "text-success", bg: "bg-success-bg" },
  meltdown: { label: "Meltdown", color: "text-danger", bg: "bg-danger-bg" },
  limbo: { label: "Time's Up", color: "text-warning", bg: "bg-warning-bg" },
};

interface ScorecardProps {
  exchanges: Exchange[];
  scenario: ScenarioConfig;
  ending: ScorecardEnding;
  insights: ScorecardInsights;
  onTryAgain: () => void;
}

export function Scorecard({
  exchanges,
  scenario,
  ending,
  insights,
  onTryAgain,
}: ScorecardProps) {
  const chartData = useMemo(
    () => buildChartData(exchanges, scenario),
    [exchanges, scenario]
  );
  const deltas = useMemo(
    () => computeExchangeDeltas(exchanges, scenario),
    [exchanges, scenario]
  );

  const banner = ENDING_BANNER[ending];
  const scenarioAha = insights.scenarios[scenario.id];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 pb-12">
      {/* Ending summary banner with AHA technique */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`flex flex-col items-center gap-2 rounded-base border-2 border-border px-6 py-4 ${banner.bg}`}
      >
        <div className="flex items-center gap-3">
          <Badge variant="neutral" className="text-xs">
            {scenario.child_name}, {scenario.child_age}
          </Badge>
          <span className={`font-heading text-xl ${banner.color}`}>
            {banner.label}
          </span>
        </div>
        {scenarioAha && (
          <p className="text-xs text-text-secondary">
            Try: <span className="font-heading text-foreground">{scenarioAha.technique}</span>
          </p>
        )}
      </motion.div>

      {/* Exchange Replay -- hero section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <ExchangeReplay
          exchanges={exchanges}
          scenario={scenario}
          deltas={deltas}
        />
      </motion.div>

      {/* AHA Technique Card */}
      {scenarioAha && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <TechniqueCard scenarioAha={scenarioAha} />
        </motion.div>
      )}

      {/* Emotional Arc Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <EmotionalArcChart data={chartData} />
      </motion.div>

      {/* Bottom actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="flex items-center justify-center gap-3 pt-4"
      >
        <Button variant="default" onClick={onTryAgain}>
          Try Again
        </Button>
        <Link href="/scenarios">
          <Button variant="neutral">Back to Scenarios</Button>
        </Link>
      </motion.div>
    </div>
  );
}
