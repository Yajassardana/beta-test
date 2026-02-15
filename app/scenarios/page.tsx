"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { scenarios, scenarioOrder } from "@/lib/scenarios";
import { resolveProfilePath, type ScenarioAssetManifest } from "@/lib/scenario-assets";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function ProfileImage({ path, childName }: { path: string | null; childName: string }) {
  const [error, setError] = useState(false);

  if (!path || error) return null;

  return (
    <div className="relative aspect-[4/3] w-full">
      <Image
        src={path}
        alt={childName}
        fill
        className="object-cover"
        sizes="(max-width: 640px) 100vw, 50vw"
        onError={() => setError(true)}
      />
    </div>
  );
}

const accentColors: Record<string, string> = {
  "toy-store": "#E67E22",
  "im-stupid": "#2563EB",
  "i-hate-you": "#DC2626",
  "the-lie": "#EAB308",
};

export default function ScenariosPage() {
  const [assetManifest, setAssetManifest] = useState<Record<string, ScenarioAssetManifest>>({});

  useEffect(() => {
    fetch("/api/dev/assets")
      .then((r) => r.json())
      .then((data: Record<string, ScenarioAssetManifest>) => setAssetManifest(data))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Button variant="neutral" size="sm">
              &larr; Home
            </Button>
          </Link>
          <motion.h1
            className="font-heading text-2xl text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            Choose a Scenario
          </motion.h1>
          <div className="w-20" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {scenarioOrder.map((id, index) => {
            const scenario = scenarios[id];
            const accent = accentColors[id];
            const profilePath = resolveProfilePath(id, assetManifest);

            return (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.1 + index * 0.1,
                  duration: 0.4,
                  ease: "easeOut",
                }}
                whileHover={{ y: -4, transition: { duration: 0.15 } }}
                whileTap={{ scale: 0.98 }}
              >
                <Link href={`/scenario/${id}`} className="block h-full">
                  <Card className="relative h-full overflow-hidden transition-shadow hover:shadow-[6px_6px_0px_0px] hover:shadow-shadow">
                    <div
                      className="h-1 w-full rounded-t-base"
                      style={{ backgroundColor: accent }}
                    />
                    <ProfileImage path={profilePath} childName={scenario.child_name} />
                    <CardHeader>
                      <CardTitle className="text-lg">
                        {scenario.title}
                      </CardTitle>
                      <CardDescription className="text-text-secondary">
                        {scenario.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1" />
                    <CardFooter className="gap-2">
                      <Badge variant="neutral">
                        {scenario.child_name}, age {scenario.child_age}
                      </Badge>
                      <Badge
                        style={{ backgroundColor: accent, color: "#fff" }}
                        className="border-border"
                      >
                        Starting State {scenario.opening_emotional_state}/10
                      </Badge>
                    </CardFooter>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>

        <motion.footer
          className="mt-16 text-center text-sm text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          Built for the Anthropic Hackathon, Feb 2026
        </motion.footer>
      </main>
    </div>
  );
}
