import { ServiceError } from "./errors.js";
import { getConfig } from "./config.js";

function mapEmotionToVisualState(emotionTag) {
  const tag = String(emotionTag ?? "steady_care").toLowerCase();

  if (tag.includes("playful")) {
    return "playful";
  }

  if (tag.includes("encouraging")) {
    return "encouraging";
  }

  if (tag.includes("concern")) {
    return "concerned";
  }

  return "calm";
}

function buildVisualPrompt(input) {
  const persona = input?.persona ?? {};
  const profile = input?.profile ?? {};
  const stateLabel = mapEmotionToVisualState(input?.emotionTag);
  const latestUserMessage = String(input?.latestUserMessage ?? "").trim();
  const latestAssistantMessage = String(input?.latestAssistantMessage ?? "").trim();
  const profileTone = Array.isArray(profile?.toneTraits) ? profile.toneTraits.join(", ") : "";
  const careStyle = Array.isArray(profile?.careStyle) ? profile.careStyle.slice(0, 2).join("; ") : "";
  const summary = String(persona?.summary ?? "").trim();
  const speakingRules = Array.isArray(persona?.speakingRules)
    ? persona.speakingRules.slice(0, 2).join("; ")
    : "";
  const baseAvatarPrompt = String(input?.avatarPrompt ?? "").trim();

  const visualDirection = {
    calm: "soft smile, relaxed shoulders, attentive eyes, gentle cozy lighting",
    concerned: "slightly worried eyes, softer mouth, caring presence, warm indoor light",
    encouraging: "brighter eyes, supportive smile, upright posture, hopeful warm glow",
    playful: "lively smile, sparkling eyes, light playful energy, sweeter pastel highlights"
  }[stateLabel];

  return [
    "Create a single anime-inspired portrait of YaYa as a lively cute young woman.",
    "Keep her clearly the same character across turns: warm approachable face, soft hair, modest everyday outfit, gentle color palette.",
    "Style: polished 2D illustration, expressive face, clean linework, soft painterly shading, premium character-card quality.",
    `Base character direction: ${baseAvatarPrompt || "gentle familiar companion with soft green and warm peach accents"}.`,
    `Persona summary: ${summary || "practical, warm, emotionally familiar digital companion"}.`,
    `Relationship tone: ${profileTone || "warm, observant, familiar"}.`,
    `Care style: ${careStyle || "gentle practical care"}.`,
    `Speaking style: ${speakingRules || "brief, caring, grounded"}.`,
    `Current emotional expression: ${stateLabel}. Visual direction: ${visualDirection}.`,
    latestUserMessage ? `User just said: ${latestUserMessage}` : "",
    latestAssistantMessage ? `YaYa just replied: ${latestAssistantMessage}` : "",
    "Focus on facial expression and upper-body pose. No text, no speech bubbles, no watermark, no UI, no extra characters."
  ]
    .filter(Boolean)
    .join("\n");
}

function extractInlineImage(payload) {
  const candidates = Array.isArray(payload?.candidates) ? payload.candidates : [];

  for (const candidate of candidates) {
    const parts = candidate?.content?.parts ?? candidate?.content?.Parts ?? [];

    for (const part of parts) {
      const inlineData = part?.inlineData ?? part?.inline_data;

      if (inlineData?.data) {
        return {
          mimeType: inlineData.mimeType ?? inlineData.mime_type ?? "image/png",
          data: inlineData.data
        };
      }
    }
  }

  return null;
}

export async function generateGeminiVisualFrame(input) {
  const config = getConfig();

  if (!config.geminiApiKey) {
    throw new ServiceError("Gemini image generation is not configured yet.", {
      status: 503,
      code: "gemini_image_unconfigured"
    });
  }

  if (!config.geminiDynamicImageModel) {
    throw new ServiceError("Gemini dynamic image model is missing.", {
      status: 503,
      code: "gemini_image_model_missing"
    });
  }

  const prompt = buildVisualPrompt(input);
  const model = config.geminiDynamicImageModel;
  const response = await fetch(
    `${config.geminiBaseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"]
        }
      })
    }
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ServiceError("Gemini image generation failed.", {
      status: response.status || 502,
      code: "gemini_image_failed",
      details: payload
    });
  }

  const image = extractInlineImage(payload);

  if (!image) {
    throw new ServiceError("Gemini did not return an image frame.", {
      status: 502,
      code: "gemini_image_missing",
      details: payload
    });
  }

  return {
    imageDataUri: `data:${image.mimeType};base64,${image.data}`,
    mimeType: image.mimeType,
    model,
    prompt,
    stateLabel: mapEmotionToVisualState(input?.emotionTag),
    revision: new Date().toISOString(),
    source: "gemini-dynamic-image"
  };
}
