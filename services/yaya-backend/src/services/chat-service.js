import { buildChatPrompt } from "../prompts.js";
import { buildSampleReply } from "../sample-data.js";
import { selectAgentSkills } from "./agent-skills-service.js";
import { applyActionIntent } from "./action-execution-service.js";
import { extractJsonObject } from "./errors.js";
import { summarizeMemory } from "./memory-service.js";
import { generateText } from "./minimax-client.js";

export async function runDialogue(input) {
  const activeSkills = Array.isArray(input.activeSkills) && input.activeSkills.length > 0
    ? input.activeSkills
    : selectAgentSkills({
        persona: input.persona,
        profile: input.profile
      });
  const derivedMemorySummary = summarizeMemory({
    existingSummary: input.memorySummary,
    history: input.history,
    userMessage: input.userMessage,
    persona: input.persona,
    profile: input.profile
  });
  const prompt = buildChatPrompt({
    ...input,
    memorySummary: derivedMemorySummary,
    skills: activeSkills
  });
  const response = await generateText({
    ...prompt,
    stage: "chat"
  });

  if (response.mode === "mock") {
    const fallbackReply = {
      ...buildSampleReply(input.userMessage, { skills: activeSkills }),
      memorySummary: derivedMemorySummary,
      activeSkills
    };

    const actionResult = applyActionIntent({
      session: input.session,
      reply: fallbackReply,
      userMessage: input.userMessage,
      channelContext: input.channelContext
    });

    return {
      ...fallbackReply,
      actionItems: actionResult.actionItems,
      actionState: actionResult.actionState
    };
  }

  const fallback = buildSampleReply(input.userMessage, { skills: activeSkills });
  let payload = null;

  try {
    payload = extractJsonObject(response.content);
  } catch {
    payload = null;
  }

  const reply = {
    message: {
      ...fallback.message,
      text: payload?.message?.text ?? fallback.message.text,
      turnType: payload?.message?.turnType ?? fallback.message.turnType
    },
    rationale: Array.isArray(payload?.rationale) ? payload.rationale : fallback.rationale,
    emotionTag:
      typeof payload?.emotionTag === "string" && payload.emotionTag.trim()
        ? payload.emotionTag
        : fallback.emotionTag,
    actionIntent:
      typeof payload?.actionIntent === "string" && payload.actionIntent.trim()
        ? payload.actionIntent
        : null,
    memorySummary: derivedMemorySummary,
    activeSkills
  };

  const actionResult = applyActionIntent({
    session: input.session,
    reply,
    userMessage: input.userMessage,
    channelContext: input.channelContext
  });

  return {
    ...reply,
    actionItems: actionResult.actionItems,
    actionState: actionResult.actionState
  };
}
