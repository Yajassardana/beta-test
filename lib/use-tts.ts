"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface UseTtsReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  error: string | null;
}

const WS_URL =
  "wss://api.deepgram.com/v1/speak?model=aura-2-amalthea-en&encoding=linear16&sample_rate=24000";

const API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY ?? "";

export function useTts(): UseTtsReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const workletReadyRef = useRef(false);
  const receivedFirstChunkRef = useRef(false);

  const ensureAudioContext = useCallback(async () => {
    if (audioCtxRef.current && workletReadyRef.current) {
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      return;
    }

    const ctx = new AudioContext({ sampleRate: 24000 });
    audioCtxRef.current = ctx;

    await ctx.audioWorklet.addModule("/pcm-player-processor.js");
    const node = new AudioWorkletNode(ctx, "pcm-player-processor");
    node.connect(ctx.destination);
    node.port.onmessage = (event: MessageEvent) => {
      if (event.data?.type === "done") {
        setIsSpeaking(false);
        receivedFirstChunkRef.current = false;
      }
    };
    workletNodeRef.current = node;
    workletReadyRef.current = true;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }
  }, []);

  const setupWsHandlers = useCallback((ws: WebSocket) => {
    ws.binaryType = "arraybuffer";

    ws.onmessage = (event: MessageEvent) => {
      if (event.data instanceof ArrayBuffer) {
        if (workletNodeRef.current) {
          workletNodeRef.current.port.postMessage(
            { command: "buffer", data: event.data },
            [event.data]
          );
        }
        if (!receivedFirstChunkRef.current) {
          receivedFirstChunkRef.current = true;
          setIsLoading(false);
          setIsSpeaking(true);
        }
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, []);

  const openWebSocket = useCallback((): Promise<WebSocket> => {
    return new Promise<WebSocket>((resolve, reject) => {
      const ws = new WebSocket(WS_URL, ["token", API_KEY]);
      wsRef.current = ws;

      ws.onopen = () => {
        setupWsHandlers(ws);
        resolve(ws);
      };

      ws.onerror = () => {
        wsRef.current = null;
        reject(new Error("WebSocket connection failed"));
      };
    });
  }, [setupWsHandlers]);

  const ensureWebSocket = useCallback(async (): Promise<WebSocket> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    return openWebSocket();
  }, [openWebSocket]);

  const stop = useCallback(() => {
    if (workletNodeRef.current) {
      workletNodeRef.current.port.postMessage({ command: "clear" });
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "Clear" }));
    }
    receivedFirstChunkRef.current = false;
    setIsSpeaking(false);
    setIsLoading(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      stop();
      setError(null);
      setIsLoading(true);
      receivedFirstChunkRef.current = false;

      try {
        await ensureAudioContext();
        const ws = await ensureWebSocket();

        ws.send(JSON.stringify({ type: "Speak", text }));
        ws.send(JSON.stringify({ type: "Flush" }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "TTS failed");
        setIsLoading(false);
      }
    },
    [stop, ensureAudioContext, ensureWebSocket]
  );

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "Close" }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      workletReadyRef.current = false;
    };
  }, []);

  return { speak, stop, isSpeaking, isLoading, error };
}
