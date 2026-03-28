import { getConfig } from "./config.js";
import { ServiceError } from "./errors.js";

function normalizeModelName(model) {
  if (model === "M2.7") {
    return "MiniMax-M2.7";
  }

  return model;
}

export function getModelManifest() {
  const config = getConfig();

  return {
    textModel: normalizeModelName(config.textModel),
    speechPath: "Gemini TTS",
    speechModel: config.geminiTtsModel,
    speechVoice: config.geminiTtsVoiceName,
    staticAvatarModel: config.imagenModel,
    dynamicExpressionModel: config.geminiDynamicImageModel || null,
    ambienceModel: config.lyriaModel,
    mockFallbackEnabled: config.allowMockFallback
  };
}

export async function generateText({ systemPrompt, userPrompt, stage, temperature = 0.7 }) {
  const config = getConfig();

  if (!config.minimaxApiKey) {
    if (!config.allowMockFallback) {
      throw new ServiceError("MINIMAX_API_KEY is not configured for the YaYa backend.", {
        status: 503,
        code: "minimax_api_key_missing"
      });
    }

    return {
      mode: "mock",
      model: normalizeModelName(config.textModel),
      stage,
      content: "{}"
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  const response = await fetch(`${config.minimaxBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.minimaxApiKey}`
    },
    body: JSON.stringify({
      model: normalizeModelName(config.textModel),
      temperature,
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ]
    }),
    signal: controller.signal
  }).catch((error) => {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ServiceError("MiniMax request timed out.", {
        status: 504,
        code: "minimax_timeout"
      });
    }

    throw new ServiceError("Failed to reach MiniMax API.", {
      status: 502,
      code: "minimax_network_error",
      details: error instanceof Error ? error.message : String(error)
    });
  });

  clearTimeout(timeout);

  if (!response.ok) {
    const responseText = await response.text();

    throw new ServiceError("MiniMax API returned an error.", {
      status: 502,
      code: "minimax_http_error",
      details: {
        stage,
        status: response.status,
        body: responseText
      }
    });
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new ServiceError("MiniMax response did not contain message content.", {
      status: 502,
      code: "minimax_invalid_response",
      details: payload
    });
  }

  return {
    mode: "live",
    model: normalizeModelName(config.textModel),
    stage,
    content,
    raw: payload
  };
}
