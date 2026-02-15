import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "SARVAM_API_KEY not configured" },
      { status: 500 }
    );
  }

  const lang = request.nextUrl.searchParams.get("lang") || "en";
  const languageCode = lang === "hi" ? "hi-IN" : "en-IN";

  const contentType = request.headers.get("content-type") ?? "audio/webm";
  const audioBuffer = await request.arrayBuffer();

  if (audioBuffer.byteLength === 0) {
    return NextResponse.json(
      { error: "No audio data received" },
      { status: 400 }
    );
  }

  try {
    const ext = contentType.includes("wav") ? "wav" : contentType.includes("mp3") ? "mp3" : "webm";
    const mimeType = contentType.split(";")[0].trim();
    const file = new File([audioBuffer], `audio.${ext}`, { type: mimeType });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "saarika:v2.5");
    formData.append("language_code", languageCode);

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": apiKey,
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Transcription failed: ${text}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    let transcript: string = data.transcript ?? "";

    // For Hindi, transliterate Devanagari to Romanized Hindi
    if (lang === "hi" && transcript.trim().length > 0) {
      const translitRes = await fetch("https://api.sarvam.ai/transliterate", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: transcript,
          source_language_code: "hi-IN",
          target_language_code: "en-IN",
          spoken_form: true,
        }),
      });

      if (translitRes.ok) {
        const translitData = await translitRes.json();
        transcript = translitData.transliterated_text ?? transcript;
      }
    }

    return NextResponse.json({ transcript });
  } catch (err) {
    return NextResponse.json(
      { error: `Transcription request failed: ${err}` },
      { status: 500 }
    );
  }
}
