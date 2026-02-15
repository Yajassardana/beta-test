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
      <main className="mx-auto max-w-4xl px-6 py-6">
        <div className="mb-8 flex items-center justify-between">
          <Link href="/">
            <Button variant="neutral" size="sm">
              &larr; Home
            </Button>
          </Link>
          <motion.h1
            className="font-heading text-4xl font-bold text-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            Scenario
          </motion.h1>
          <div className="w-20" />
        </div>

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-1 justify-items-center">
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
                className="w-full max-w-md"
              >
                <Card className="relative h-full overflow-hidden">
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
                  <CardFooter className="flex-col items-stretch gap-3">
                    <div className="flex gap-2">
                      <Badge variant="neutral">
                        {scenario.child_name}, age {scenario.child_age}
                      </Badge>
                      <Badge
                        style={{ backgroundColor: accent, color: "#fff" }}
                        className="border-border"
                      >
                        Starting State {scenario.opening_emotional_state}/10
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/voice/${id}?lang=en`} className="flex-1">
                        <Button
                          variant="neutral"
                          size="sm"
                          className="w-full"
                          style={{ borderColor: "#2563EB" }}
                        >
                          English Voice
                        </Button>
                      </Link>
                      <Link href={`/voice/${id}?lang=hi`} className="flex-1">
                        <Button
                          variant="neutral"
                          size="sm"
                          className="w-full"
                          style={{ borderColor: "#E67E22" }}
                        >
                          Hindi Voice
                        </Button>
                      </Link>
                    </div>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <motion.footer
          className="mt-6 text-center text-sm text-text-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          Build India Hackathon, Feb 2026
        </motion.footer>
      </main>
    </div>
  );
}
