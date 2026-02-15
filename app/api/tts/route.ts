import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

async function synthesize(text: string) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not configured" },
      { status: 500 }
    );
  }

  if (!text.trim()) {
    return NextResponse.json(
      { error: "Text is required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      "https://api.deepgram.com/v1/speak?model=aura-2-amalthea-en",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `TTS failed: ${errorText}` },
        { status: res.status }
      );
    }

    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `TTS request failed: ${err}` },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const text = request.nextUrl.searchParams.get("text") ?? "";
  return synthesize(text);
}

export async function POST(request: NextRequest) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  return synthesize(body.text ?? "");
}
