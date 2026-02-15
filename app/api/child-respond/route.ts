import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic } from "@/lib/anthropic";
import { getScenario } from "@/lib/scenarios";
import { getSystemPrompt } from "@/lib/prompts";
import { Exchange } from "@/lib/types";
import { getToolSchema } from "@/lib/tool-schema";
import { getDevConfig } from "@/app/api/dev/config/route";

interface RequestBody {
  scenario_id: string;
  parent_message: string;
  history: Exchange[];
  voice_mode?: string;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { scenario_id, parent_message, history } = body;

  if (!scenario_id || !parent_message) {
    return NextResponse.json(
      { error: "Missing scenario_id or parent_message" },
      { status: 400 }
    );
  }

  const scenario = getScenario(scenario_id);
  if (!scenario) {
    return NextResponse.json(
      { error: `Unknown scenario: ${scenario_id}` },
      { status: 400 }
    );
  }

  const config = getDevConfig();
  const lang: "en" | "hi" = body.voice_mode === "hindi" ? "hi" : "en";
  const toolSchema = getToolSchema(lang);
  const systemPrompt = getSystemPrompt(scenario, lang);
  const messages = buildMessages(history, parent_message);

  const tool: Anthropic.Tool = {
    name: "child_response",
    description:
      "Output the child's response to the parent's message. You MUST call this tool with every response.",
    input_schema: toolSchema as Anthropic.Tool.InputSchema,
  };

  // Retry loop for establishing stream (529 handling)
  let stream: ReturnType<typeof anthropic.messages.stream> | null = null;
  for (let attempt = 0; attempt < config.retry_count; attempt++) {
    try {
      stream = anthropic.messages.stream({
        model: config.model,
        max_tokens: config.max_tokens,
        temperature: config.temperature,
        system: [
          {
            type: "text" as const,
            text: systemPrompt,
            cache_control: { type: "ephemeral" as const },
          },
        ],
        messages,
        tools: [tool],
        tool_choice: { type: "tool", name: "child_response" },
      });
      // Test that the stream connects by awaiting the first event check
      break;
    } catch (err) {
      const isOverloaded =
        err instanceof Anthropic.APIError && err.status === 529;
      if (isOverloaded && attempt < config.retry_count - 1) {
        await new Promise((r) =>
          setTimeout(r, config.retry_base_delay_ms * (attempt + 1))
        );
        continue;
      }
      const message =
        err instanceof Error ? err.message : "Unknown error calling model";
      const status = err instanceof Anthropic.APIError ? err.status : 500;
      return NextResponse.json({ error: message }, { status });
    }
  }

  if (!stream) {
    return NextResponse.json(
      { error: "Max retries exceeded" },
      { status: 503 }
    );
  }

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
        );
      };

      try {
        for await (const event of stream!) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "input_json_delta"
          ) {
            send({ type: "json_delta", chunk: event.delta.partial_json });
          }
        }

        const finalMessage = await stream!.finalMessage();
        const toolBlock = finalMessage.content.find(
          (b: Anthropic.ContentBlock): b is Anthropic.ToolUseBlock =>
            b.type === "tool_use"
        );

        if (toolBlock) {
          send({ type: "complete", data: toolBlock.input });
        } else {
          send({ type: "error", message: "No tool use in response" });
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Stream error";
        send({ type: "error", message });
      }

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

function buildMessages(
  history: Exchange[],
  currentMessage: string
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  for (let i = 0; i < history.length; i++) {
    const exchange = history[i];
    const toolUseId = `exchange_${i + 1}`;

    messages.push({
      role: "user",
      content: exchange.parent_message,
    });
    messages.push({
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolUseId,
          name: "child_response",
          input: exchange.child_response,
        },
      ],
    });
    const isLastHistoryEntry = i === history.length - 1;

    messages.push({
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolUseId,
          content: "Response delivered to parent. Awaiting next message.",
          ...(isLastHistoryEntry && {
            cache_control: { type: "ephemeral" as const },
          }),
        },
      ],
    });
  }

  messages.push({
    role: "user",
    content: `<parent_message>\n${currentMessage}\n</parent_message>`,
  });

  return messages;
}
