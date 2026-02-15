"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause } from "lucide-react";
import { ScenarioConfig } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ScenarioIntroProps {
  videoPath: string;
  scenario: ScenarioConfig;
  onComplete: () => void;
}

export function ScenarioIntro({
  videoPath,
  scenario,
  onComplete,
}: ScenarioIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFinished, setVideoFinished] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current || videoFinished) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying, videoFinished]);

  const handleSkip = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onComplete();
  }, [onComplete]);

  const handleVideoEnd = useCallback(() => {
    setIsPlaying(false);
    setVideoFinished(true);
    setTimeout(() => setVideoEnded(true), 500);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === " ") {
        e.preventDefault();
        if (videoEnded) {
          onComplete();
        } else {
          togglePlayPause();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSkip, togglePlayPause, videoEnded, onComplete]);

  return (
    <Card className="w-full max-w-3xl overflow-hidden">
      <CardHeader className="flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <CardTitle className="text-xl">{scenario.title}</CardTitle>
          <Badge variant="neutral">
            {scenario.child_name}, {scenario.child_age}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative overflow-hidden rounded-base border-2 border-border">
          <AnimatePresence mode="wait">
            {videoEnded ? (
              <motion.div
                key="prompt"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="flex aspect-video w-full flex-col items-center justify-center gap-6 bg-secondary-background"
              >
                <p className="text-center font-heading text-2xl text-foreground">
                  Are you ready to talk to {scenario.child_name}?
                </p>
                <Button variant="default" size="lg" onClick={onComplete}>
                  Let&apos;s talk
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="video"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <video
                  ref={videoRef}
                  src={videoPath}
                  playsInline
                  onEnded={handleVideoEnd}
                  onError={onComplete}
                  className="aspect-video w-full bg-foreground/5"
                />
                {!videoFinished && (
                  <button
                    onClick={togglePlayPause}
                    className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-secondary-background/90 transition-colors hover:bg-secondary-background"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 text-foreground" />
                    ) : (
                      <Play className="h-4 w-4 text-foreground" />
                    )}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">
            {scenario.description}
          </p>
          {!videoFinished && (
            <Button
              variant="neutral"
              size="sm"
              onClick={handleSkip}
              className="ml-4 shrink-0"
            >
              Skip Intro
              <span className="ml-1 text-xs text-text-muted">(Esc)</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
