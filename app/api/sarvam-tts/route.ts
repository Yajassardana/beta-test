import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SARVAM_API_KEY not configured" },
      { status: 500 }
    );
  }

  let text: string;
  let language: string = "en";
  try {
    const body = await request.json();
    text = body.text;
    if (body.language) language = body.language;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!text || text.trim().length === 0) {
    return NextResponse.json(
      { error: "No text provided" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: language === "hi" ? "hi-IN" : "en-IN",
        speaker: "ritu",
        model: "bulbul:v3",
        enable_preprocessing: true,
        speech_sample_rate: 24000,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json(
        { error: `TTS failed: ${errorText}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const audioBase64 = data.audios?.[0];

    if (!audioBase64) {
      return NextResponse.json(
        { error: "No audio returned from Sarvam TTS" },
        { status: 500 }
      );
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `TTS request failed: ${err}` },
      { status: 500 }
    );
  }
}
