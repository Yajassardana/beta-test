"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface UseVoiceInputReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  isSupported: boolean;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
}

export function useVoiceInput(
  onTranscriptReady?: (text: string) => void
): UseVoiceInputReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const callbackRef = useRef(onTranscriptReady);
  callbackRef.current = onTranscriptReady;

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined";
    setIsSupported(supported);
  }, []);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      releaseStream();
    };
  }, [releaseStream]);

  const startRecording = useCallback(async () => {
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
    } catch {
      setError(
        "Microphone access denied. Please allow microphone permission."
      );
      return;
    }

    chunksRef.current = [];

    const recorder = new MediaRecorder(stream, {
      mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : undefined,
    });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      releaseStream();

      const chunks = chunksRef.current;
      if (chunks.length === 0) return;

      const blob = new Blob(chunks, { type: recorder.mimeType });
      chunksRef.current = [];

      setIsTranscribing(true);
      try {
        const res = await fetch("/api/transcribe", {
          method: "POST",
          headers: { "Content-Type": blob.type },
          body: blob,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Transcription failed");
        }

        const data = await res.json();
        if (data.transcript) {
          callbackRef.current?.(data.transcript);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Transcription failed."
        );
      } finally {
        setIsTranscribing(false);
      }
    };

    recorder.start(250);
    setIsRecording(true);
  }, [releaseStream]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    isTranscribing,
    isSupported,
    error,
    startRecording,
    stopRecording,
  };
}
