"use client";

import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScenarioAha } from "@/lib/types";

interface TechniqueCardProps {
  scenarioAha: ScenarioAha;
}

export function TechniqueCard({ scenarioAha }: TechniqueCardProps) {
  const hasReferences =
    scenarioAha.references && scenarioAha.references.length > 0;

  return (
    <Card className="gap-0 py-0 overflow-hidden bg-main/5">
      <CardHeader className="py-3 px-4">
        <p className="text-xs uppercase tracking-wide text-main">
          What You Could Have Done Differently
        </p>
        <CardTitle className="text-lg text-main">{scenarioAha.technique}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <p className="text-sm leading-relaxed text-foreground">
          {scenarioAha.explanation}
        </p>

        <div className="rounded-base border-2 border-main/30 bg-main/10 px-4 py-3">
          <p className="mb-1 text-[10px] uppercase tracking-widest text-text-muted">
            Example
          </p>
          <p className="font-heading text-sm italic text-foreground">
            {scenarioAha.example}
          </p>
        </div>

        {hasReferences && (
          <div className="flex flex-wrap gap-2 pt-1">
            {scenarioAha.references!.map((ref, i) => (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-main/40 bg-secondary-background px-3 py-1 text-xs font-heading text-main transition-colors hover:bg-main hover:text-main-foreground"
              >
                {ref.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
