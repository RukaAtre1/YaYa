import { getConfig } from "./config.js";
import { ServiceError } from "./errors.js";

const EMOTION_SPEAKING_STYLES = {
  calm: "calm and gentle",
  steady_care: "warm, steady, and familiar",
  concerned_supportive: "softly concerned and reassuring",
  encouraging_push: "encouraging, grounded, and lightly energizing",
  playful_light: "light, warm, and a little playful"
};

function buildSpeechPrompt(text, emotionTag) {
  const speakingStyle =
    EMOTION_SPEAKING_STYLES[String(emotionTag ?? "").trim()] ?? "warm, steady, and familiar";

  return `Read the following reply exactly as written. Keep the delivery ${speakingStyle}. Reply with speech only.\n\n${text}`;
}

function parseSampleRate(rawMimeType, fallbackRate) {
  const match = String(rawMimeType ?? "").match(/rate=(\d+)/i);

  return match ? Number(match[1]) : fallbackRate;
}

function createWaveHeader({ dataLength, sampleRateHz, channels, bytesPerSample }) {
  const byteRate = sampleRateHz * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const buffer = Buffer.alloc(44);

  buffer.write("RIFF", 0, 4, "ascii");
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8, 4, "ascii");
  buffer.write("fmt ", 12, 4, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRateHz, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write("data", 36, 4, "ascii");
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

function pcmToWaveBase64(pcmBase64, { sampleRateHz, channels = 1, bytesPerSample = 2 }) {
  const pcmBuffer = Buffer.from(pcmBase64, "base64");
  const header = createWaveHeader({
    dataLength: pcmBuffer.length,
    sampleRateHz,
    channels,
    bytesPerSample
  });

  return {
    waveBase64: Buffer.concat([header, pcmBuffer]).toString("base64"),
    byteLength: pcmBuffer.length,
    durationMs: Math.round((pcmBuffer.length / (sampleRateHz * channels * bytesPerSample)) * 1000)
  };
}

function extractAudioPart(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts;

    if (!Array.isArray(parts)) {
      continue;
    }

    for (const part of parts) {
      if (typeof part?.inlineData?.data === "string" && part.inlineData.data.length > 0) {
        return part.inlineData;
      }
    }
  }

  throw new ServiceError("Gemini TTS response did not include audio data.", {
    status: 502,
    code: "gemini_tts_invalid_response",
    details: payload
  });
}

export async function synthesizeGeminiSpeech(input) {
  const config = getConfig();

  if (config.configuredGeminiSpeechMode !== "tts") {
    throw new ServiceError("YaYa runtime is locked to Gemini TTS only in v1.", {
      status: 409,
      code: "gemini_speech_mode_locked",
      details: {
        configuredMode: config.configuredGeminiSpeechMode
      }
    });
  }

  if (!config.geminiApiKey) {
    throw new ServiceError("GEMINI_API_KEY is not configured for Gemini TTS.", {
      status: 503,
      code: "gemini_api_key_missing"
    });
  }

  const text = String(input?.text ?? input?.message?.text ?? "").trim();

  if (!text) {
    throw new ServiceError("Speech synthesis requires non-empty text.", {
      status: 400,
      code: "speech_text_missing"
    });
  }

  const emotionTag = String(input?.emotionTag ?? "steady_care");
  const voiceName = String(input?.voiceName ?? config.geminiTtsVoiceName).trim() || "Kore";
  const speechPrompt = buildSpeechPrompt(text, emotionTag);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  const response = await fetch(
    `${config.geminiBaseUrl}/v1beta/models/${config.geminiTtsModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiApiKey
      },
      body: JSON.stringify({
        model: config.geminiTtsModel,
        contents: [
          {
            parts: [
              {
                text: speechPrompt
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName
              }
            }
          }
        }
      }),
      signal: controller.signal
    }
  ).catch((error) => {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ServiceError("Gemini TTS request timed out.", {
        status: 504,
        code: "gemini_tts_timeout"
      });
    }

    throw new ServiceError("Failed to reach Gemini TTS API.", {
      status: 502,
      code: "gemini_tts_network_error",
      details: error instanceof Error ? error.message : String(error)
    });
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const responseText = await response.text();

    throw new ServiceError("Gemini TTS API returned an error.", {
      status: 502,
      code: "gemini_tts_http_error",
      details: {
        status: response.status,
        body: responseText
      }
    });
  }

  const payload = await response.json();
  const inlineData = extractAudioPart(payload);
  const rawMimeType = inlineData.mimeType ?? "audio/pcm;rate=24000";
  const sampleRateHz = parseSampleRate(rawMimeType, config.geminiTtsSampleRateHz);
  const wave = pcmToWaveBase64(inlineData.data, { sampleRateHz });

  return {
    ok: true,
    status: "ready",
    speechPath: "Gemini TTS",
    source: "gemini-tts",
    model: config.geminiTtsModel,
    input: {
      text,
      emotionTag,
      voiceName
    },
    audio: {
      mimeType: "audio/wav",
      data: wave.waveBase64,
      encoding: "LINEAR16",
      channels: 1,
      sampleRateHz,
      durationMs: wave.durationMs,
      byteLength: wave.byteLength
    },
    rawAudio: {
      mimeType: rawMimeType
    }
  };
}
