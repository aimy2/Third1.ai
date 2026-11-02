
export async function POST(request: Request) {
  try {
    // 1. Check that our API key exists.
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "Transcription service is not configured." },
        { status: 500 }
      );
    }

    // 2. Receive the uploaded audio.
    const incomingData = await request.formData();
    const audio = incomingData.get("file");

    if (!(audio instanceof File)) {
      return Response.json(
        { error: "Please provide an audio file." },
        { status: 400 }
      );
    }

    // 3. Validate audio size.
    const MAX_AUDIO_SIZE = 25 * 1024 * 1024;

    if (audio.size === 0) {
      return Response.json(
        { error: "The uploaded audio file is empty." },
        { status: 400 }
      );
    }

    if (audio.size > MAX_AUDIO_SIZE) {
      return Response.json(
        { error: "Audio must not exceed 25 MB." },
        { status: 413 }
      );
    }

    // 4. Normalize and validate the MIME type.
    // This handles values such as audio/webm;codecs=opus.
    const baseMimeType = audio.type
      .split(";")[0]
      .trim()
      .toLowerCase();

    const ALLOWED_AUDIO_TYPES = [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/ogg",
      "audio/flac",
      "audio/aac",
    ];

    if (!ALLOWED_AUDIO_TYPES.includes(baseMimeType)) {
      return Response.json(
        { error: "Unsupported audio format." },
        { status: 415 }
      );
    }

    // 5. Prepare the audio for Groq.
    const groqData = new FormData();

    groqData.append("file", audio, audio.name || "recording");
    groqData.append("model", "whisper-large-v3");
    groqData.append("response_format", "json");
    groqData.append("temperature", "0");
    groqData.append(
    "prompt",
    "Transcribe exactly what the speaker says, regardless of the language or languages spoken. Always write the entire transcription using the Latin (English) alphabet. For languages that normally use other writing systems, transliterate the spoken words into Latin characters rather than translating them. Preserve the original words, pronunciation as closely as practical, meaning, and natural language switching. Keep English words in English. Do not translate, paraphrase, summarize, or convert speech into another language. Do not invent words."
    );

    // We deliberately omit the language parameter.
    // Whisper detects the spoken language automatically.

    // 6. Send the audio to Groq with a timeout.
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30_000);

    let groqResponse: Response;

    try {
      groqResponse = await fetch(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          body: groqData,
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    // 7. Read and handle the provider response.
    const result = await groqResponse.json();

    if (!groqResponse.ok) {
      if (groqResponse.status === 429) {
        return Response.json(
          {
            error:
              "Transcription is temporarily rate-limited. Please try again later.",
          },
          { status: 429 }
        );
      }

      console.error(
        "Groq transcription error:",
        groqResponse.status,
        result.error?.message
      );

      return Response.json(
        { error: "Transcription failed. Please try again." },
        { status: 502 }
      );
    }

    // 8. Validate the returned transcript.
    if (typeof result.text !== "string" || !result.text.trim()) {
      return Response.json(
        { error: "No speech could be recognized in this recording." },
        { status: 422 }
      );
    }

    // 9. Return only the transcript to our frontend.
    return Response.json({
      text: result.text.trim(),
    });
  } catch (error) {
    // Handle request timeouts separately.
    if (error instanceof Error && error.name === "AbortError") {
      return Response.json(
        {
          error:
            "Transcription took too long. Please try a shorter recording.",
        },
        { status: 504 }
      );
    }

    console.error("Transcription route error:", error);

    return Response.json(
      { error: "Something went wrong while transcribing audio." },
      { status: 500 }
    );
  }
}
