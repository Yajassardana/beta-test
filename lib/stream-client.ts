import { Exchange } from "@/lib/types";

interface StreamCallbacks {
  onJsonDelta: (chunk: string) => void;
  onDialogueDelta: (newText: string) => void;
  onDialogueComplete?: (text: string) => void;
  onTtsTextReady?: (text: string) => void;
  onComplete: (data: Record<string, unknown>) => void;
  onError: (message: string) => void;
}

interface StreamOptions {
  ttsField?: string;
}

export async function streamChildResponse(
  body: {
    scenario_id: string;
    parent_message: string;
    history: Exchange[];
    voice_mode?: string;
  },
  callbacks: StreamCallbacks,
  options?: StreamOptions
): Promise<void> {
  const res = await fetch("/api/child-respond", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const errData = await res.json();
      errorMsg = errData.error || errorMsg;
    } catch {
      // keep default error
    }
    callbacks.onError(errorMsg);
    return;
  }

  if (!res.body) {
    callbacks.onError("No response body");
    return;
  }

  const ttsField = options?.ttsField;
  const hasSeparateTtsField =
    ttsField && ttsField !== "child_dialogue";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let jsonAccumulated = "";
  let lastDialogueLength = 0;
  let dialogueCompleteFired = false;
  let ttsCompleteFired = false;

  // Build regexes for TTS field extraction
  const ttsFullRegex = hasSeparateTtsField
    ? new RegExp(
        `"${ttsField}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`,
      )
    : null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      let event: Record<string, unknown>;
      try {
        event = JSON.parse(line.slice(6));
      } catch {
        continue;
      }

      if (event.type === "json_delta") {
        const chunk = event.chunk as string;
        jsonAccumulated += chunk;
        callbacks.onJsonDelta(chunk);

        // Extract child_dialogue progressively for UI display
        const match = jsonAccumulated.match(
          /"child_dialogue"\s*:\s*"((?:[^"\\]|\\.)*)"/
        );
        if (match) {
          try {
            const unescaped = JSON.parse('"' + match[1] + '"');
            if (unescaped.length > lastDialogueLength) {
              callbacks.onDialogueDelta(unescaped.slice(lastDialogueLength));
              lastDialogueLength = unescaped.length;
            }
            if (!dialogueCompleteFired) {
              dialogueCompleteFired = true;
              callbacks.onDialogueComplete?.(unescaped);
              if (!hasSeparateTtsField) {
                callbacks.onTtsTextReady?.(unescaped);
              }
            }
          } catch {
            // partial escape sequence
          }
        } else {
          const partialMatch = jsonAccumulated.match(
            /"child_dialogue"\s*:\s*"((?:[^"\\]|\\.)*)$/
          );
          if (partialMatch) {
            try {
              const unescaped = JSON.parse('"' + partialMatch[1] + '"');
              if (unescaped.length > lastDialogueLength) {
                callbacks.onDialogueDelta(unescaped.slice(lastDialogueLength));
                lastDialogueLength = unescaped.length;
              }
            } catch {
              // partial escape sequence
            }
          }
        }

        // Extract TTS field (e.g., child_dialogue_devanagari) separately
        if (hasSeparateTtsField && !ttsCompleteFired && ttsFullRegex) {
          const ttsMatch = jsonAccumulated.match(ttsFullRegex);
          if (ttsMatch) {
            try {
              const unescaped = JSON.parse('"' + ttsMatch[1] + '"');
              ttsCompleteFired = true;
              callbacks.onTtsTextReady?.(unescaped);
            } catch {
              // partial escape sequence
            }
          }
        }
      } else if (event.type === "complete") {
        callbacks.onComplete(event.data as Record<string, unknown>);
      } else if (event.type === "error") {
        callbacks.onError(event.message as string);
      }
    }
  }
}
