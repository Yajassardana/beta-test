import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not configured" },
      { status: 500 }
    );
  }

  const contentType = request.headers.get("content-type") ?? "audio/webm";
  const audioBuffer = await request.arrayBuffer();

  if (audioBuffer.byteLength === 0) {
    return NextResponse.json(
      { error: "No audio data received" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": contentType,
        },
        body: audioBuffer,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Transcription failed: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    const transcript =
      data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";

    return NextResponse.json({ transcript });
  } catch (err) {
    return NextResponse.json(
      { error: `Transcription request failed: ${err}` },
      { status: 500 }
    );
  }
}
