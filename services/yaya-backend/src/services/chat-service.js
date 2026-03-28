import { buildChatPrompt } from "../prompts.js";
import { buildSampleReply } from "../sample-data.js";
import { extractJsonObject } from "./errors.js";
import { generateText } from "./minimax-client.js";

export async function runDialogue(input) {
  const prompt = buildChatPrompt(input);
  const response = await generateText({
    ...prompt,
    stage: "chat"
  });

  if (response.mode === "mock") {
    return buildSampleReply(input.userMessage);
  }

  const payload = extractJsonObject(response.content);
  const fallback = buildSampleReply(input.userMessage);

  return {
    message: {
      ...fallback.message,
      text: payload?.message?.text ?? fallback.message.text,
      turnType: payload?.message?.turnType ?? fallback.message.turnType
    },
    rationale: Array.isArray(payload.rationale) ? payload.rationale : fallback.rationale,
    emotionTag:
      typeof payload?.emotionTag === "string" && payload.emotionTag.trim()
        ? payload.emotionTag
        : fallback.emotionTag,
    actionIntent:
      typeof payload?.actionIntent === "string" && payload.actionIntent.trim()
        ? payload.actionIntent
        : null
  };
}
