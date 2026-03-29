import { buildSampleReply } from "../sample-data.js";
import { generateText } from "./minimax-client.js";
import { extractJsonObject } from "./errors.js";

function defaultRoutines() {
  return [
    {
      id: "study_evening",
      label: "Study",
      kind: "study",
      enabled: true,
      hour: 20,
      minute: 30
    },
    {
      id: "water_daytime",
      label: "Water",
      kind: "water",
      enabled: true,
      intervalMinutes: 90,
      startHour: 10,
      endHour: 22
    },
    {
      id: "sleep_night",
      label: "Sleep",
      kind: "sleep",
      enabled: true,
      hour: 23,
      minute: 30
    }
  ];
}

function getLocalParts(nowIso, timezone) {
  const date = new Date(nowIso);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    isoDate: `${parts.year}-${parts.month}-${parts.day}`
  };
}

function minutesSince(thenIso, nowIso) {
  if (!thenIso) {
    return Number.POSITIVE_INFINITY;
  }

  const diffMs = new Date(nowIso).getTime() - new Date(thenIso).getTime();
  return diffMs / 60000;
}

function shouldTriggerRoutine(routine, nowIso, localParts, proactiveState) {
  if (!routine?.enabled) {
    return false;
  }

  const lastTriggeredAt = proactiveState.lastTriggeredAtByRoutine?.[routine.id];
  const lastLocalDate = lastTriggeredAt ? getLocalParts(lastTriggeredAt, proactiveState.timezone).isoDate : "";

  if (routine.kind === "water") {
    const inWindow =
      typeof routine.startHour === "number" &&
      typeof routine.endHour === "number" &&
      localParts.hour >= routine.startHour &&
      localParts.hour <= routine.endHour;
    return inWindow && minutesSince(lastTriggeredAt, nowIso) >= (routine.intervalMinutes ?? 90);
  }

  const targetMinutes = (routine.hour ?? 0) * 60 + (routine.minute ?? 0);
  const nowMinutes = localParts.hour * 60 + localParts.minute;
  const sameDayAlreadyTriggered = lastLocalDate === localParts.isoDate;

  return !sameDayAlreadyTriggered && nowMinutes >= targetMinutes && nowMinutes <= targetMinutes + 30;
}

function buildProactivePrompt({ persona, memorySummary, routine, localParts }) {
  const reasonByKind = {
    study:
      "It is time to nudge the user into a focused study block. Sound like a caring but capable friend. Offer a tiny study sprint, not a lecture.",
    water:
      "It is time to remind the user to drink water. Keep it light, warm, and human. Do not sound like an alarm clock.",
    sleep:
      "It is late and the user should start winding down for sleep. Sound familiar, protective, and a little persuasive."
  };

  return {
    systemPrompt: [
      "You are YaYa, a proactive relationship-native agent.",
      "You sometimes reach out first.",
      "Return only valid JSON and no markdown fences."
    ].join("\n"),
    userPrompt: [
      "Return this JSON shape:",
      "{",
      '  "message": {',
      '    "text": "reply text",',
      '    "turnType": "reminder | proactive_check_in | light_suggestion"',
      "  },",
      '  "rationale": ["short reason"],',
      '  "emotionTag": "short_emotion_bucket",',
      '  "actionIntent": "optional_task_intent_or_null"',
      "}",
      "",
      `Persona summary: ${persona?.summary ?? "Warm proactive digital companion."}`,
      `Memory summary: ${memorySummary ?? ""}`,
      `Local time: ${localParts.hour.toString().padStart(2, "0")}:${localParts.minute.toString().padStart(2, "0")}`,
      `Routine: ${routine.label}`,
      `Instruction: ${reasonByKind[routine.kind]}`,
      "",
      "Requirements:",
      "- Keep it under 80 words.",
      "- Sound like a real person who knows the user.",
      "- If the routine is study, suggest a small study plan or first step.",
      '- Use actionIntent for practical nudges like "study_plan", "drink_water", or "sleep_nudge".'
    ].join("\n")
  };
}

function buildFallbackProactiveReply(routine) {
  if (routine.kind === "study") {
    return {
      ...buildSampleReply("hackathon study plan", { skills: [{ id: "study_coach" }] }),
      message: {
        id: `proactive-${Date.now()}`,
        role: "assistant",
        text: "Study time. Give me one topic and I’ll turn it into a 25-minute sprint with a tiny checklist.",
        timestamp: new Date().toISOString(),
        turnType: "proactive_check_in"
      },
      emotionTag: "encouraging_push",
      actionIntent: "study_plan"
    };
  }

  if (routine.kind === "water") {
    return {
      message: {
        id: `proactive-${Date.now()}`,
        role: "assistant",
        text: "Drink some water first, then come back. Tiny reset, not a big interruption.",
        timestamp: new Date().toISOString(),
        turnType: "reminder"
      },
      rationale: ["Hydration reminder", "Kept it brief and human"],
      emotionTag: "steady_care",
      actionIntent: "drink_water"
    };
  }

  return {
    message: {
      id: `proactive-${Date.now()}`,
      role: "assistant",
      text: "It’s getting late. Wrap the one thing that matters, then let yourself sleep earlier tonight.",
      timestamp: new Date().toISOString(),
      turnType: "reminder"
    },
    rationale: ["Sleep reminder", "Protective, familiar tone"],
    emotionTag: "concerned_supportive",
    actionIntent: "sleep_nudge"
  };
}

export function buildDefaultProactiveState(timezone = "America/Los_Angeles") {
  return {
    timezone,
    routines: defaultRoutines(),
    lastTriggeredAtByRoutine: {}
  };
}

export async function checkProactiveNudge({
  session,
  nowIso = new Date().toISOString(),
  timezone = "America/Los_Angeles"
}) {
  const proactiveState = session?.proactiveState ?? buildDefaultProactiveState(timezone);
  const nextState = {
    ...proactiveState,
    timezone,
    routines: Array.isArray(proactiveState.routines) && proactiveState.routines.length > 0
      ? proactiveState.routines
      : defaultRoutines(),
    lastTriggeredAtByRoutine: { ...(proactiveState.lastTriggeredAtByRoutine ?? {}) }
  };
  const localParts = getLocalParts(nowIso, timezone);
  const dueRoutine = nextState.routines.find((routine) =>
    shouldTriggerRoutine(routine, nowIso, localParts, nextState)
  );

  if (!dueRoutine) {
    return {
      triggered: false,
      proactiveState: nextState
    };
  }

  const prompt = buildProactivePrompt({
    persona: session?.persona,
    memorySummary: session?.memorySummary,
    routine: dueRoutine,
    localParts
  });

  const response = await generateText({
    ...prompt,
    stage: "proactive",
    temperature: 0.8
  });

  const fallback = buildFallbackProactiveReply(dueRoutine);
  let payload = null;

  if (response.mode !== "mock") {
    try {
      payload = extractJsonObject(response.content);
    } catch {
      payload = null;
    }
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
        : fallback.actionIntent,
    memorySummary: session?.memorySummary ?? "",
    activeSkills: session?.activeSkills ?? []
  };

  nextState.lastTriggeredAtByRoutine[dueRoutine.id] = nowIso;

  return {
    triggered: true,
    routineId: dueRoutine.id,
    reply,
    proactiveState: nextState
  };
}
