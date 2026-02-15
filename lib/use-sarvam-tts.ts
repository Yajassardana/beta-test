"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseTtsReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useTts(language?: "en" | "hi"): UseTtsReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const langRef = useRef(language || "en");
  langRef.current = language || "en";

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load();
      audioRef.current = null;
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    cleanup();
    setIsSpeaking(false);
    setIsLoading(false);
  }, [cleanup]);

  const speak = useCallback(
    async (text: string) => {
      stop();
      setError(null);
      setIsLoading(true);

      try {
        const res = await fetch("/api/sarvam-tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, language: langRef.current }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "TTS failed");
        }

        const audioBlob = await res.blob();
        const url = URL.createObjectURL(audioBlob);
        blobUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsLoading(false);
          setIsSpeaking(true);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          cleanup();
        };

        audio.onerror = () => {
          setError("Audio playback failed");
          setIsSpeaking(false);
          setIsLoading(false);
          cleanup();
        };

        await audio.play();
      } catch (err) {
        setError(err instanceof Error ? err.message : "TTS failed");
        setIsLoading(false);
      }
    },
    [stop, cleanup]
  );

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { speak, stop, isSpeaking, isLoading, error };
}
