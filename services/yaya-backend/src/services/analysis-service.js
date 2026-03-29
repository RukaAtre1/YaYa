import { buildAnalysisPrompt } from "../prompts.js";
import { sampleProfile } from "../sample-data.js";
import { extractJsonObject } from "./errors.js";
import { generateText } from "./minimax-client.js";

export async function analyzeRelationalData(transcript) {
  const prompt = buildAnalysisPrompt(transcript);
  const response = await generateText({
    ...prompt,
    stage: "analysis"
  });

  if (response.mode === "mock") {
    return sampleProfile;
  }

  let payload = null;

  try {
    payload = extractJsonObject(response.content);
  } catch {
    return sampleProfile;
  }

  return {
    relationshipLabel: payload.relationshipLabel ?? sampleProfile.relationshipLabel,
    toneTraits: Array.isArray(payload.toneTraits) ? payload.toneTraits : sampleProfile.toneTraits,
    careStyle: Array.isArray(payload.careStyle) ? payload.careStyle : sampleProfile.careStyle,
    initiativeStyle: Array.isArray(payload.initiativeStyle)
      ? payload.initiativeStyle
      : sampleProfile.initiativeStyle,
    recurringConcerns: Array.isArray(payload.recurringConcerns)
      ? payload.recurringConcerns
      : sampleProfile.recurringConcerns,
    languageHabits: Array.isArray(payload.languageHabits)
      ? payload.languageHabits
      : sampleProfile.languageHabits,
    evidence: Array.isArray(payload.evidence) ? payload.evidence : sampleProfile.evidence
  };
}
