import { buildPersonaPrompt } from "../prompts.js";
import { samplePersona } from "../sample-data.js";
import { extractJsonObject } from "./errors.js";
import { generateText } from "./minimax-client.js";

export async function compilePersona(profile) {
  const prompt = buildPersonaPrompt(profile);
  const response = await generateText({
    ...prompt,
    stage: "persona"
  });

  if (response.mode === "mock") {
    return samplePersona;
  }

  const payload = extractJsonObject(response.content);

  return {
    name: payload.name ?? samplePersona.name,
    summary: payload.summary ?? samplePersona.summary,
    speakingRules: Array.isArray(payload.speakingRules)
      ? payload.speakingRules
      : samplePersona.speakingRules,
    proactivePatterns: Array.isArray(payload.proactivePatterns)
      ? payload.proactivePatterns
      : samplePersona.proactivePatterns,
    comfortStyle: Array.isArray(payload.comfortStyle)
      ? payload.comfortStyle
      : samplePersona.comfortStyle,
    boundaries: Array.isArray(payload.boundaries) ? payload.boundaries : samplePersona.boundaries
  };
}
