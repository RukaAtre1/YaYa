export function buildAnalysisPrompt(messages) {
  return {
    systemPrompt: [
      "You extract relational style from user-authorized conversations.",
      "Return only valid JSON.",
      "Do not wrap the JSON in markdown fences.",
      "Keep outputs grounded in the provided transcript and avoid generic role-play language."
    ].join("\n"),
    userPrompt: [
      "Analyze the transcript and return this JSON shape:",
      '{',
      '  "relationshipLabel": "short phrase",',
      '  "toneTraits": ["trait"],',
      '  "careStyle": ["pattern"],',
      '  "initiativeStyle": ["pattern"],',
      '  "recurringConcerns": ["concern"],',
      '  "languageHabits": ["habit"],',
      '  "evidence": [',
      '    { "id": "ev-1", "speakerName": "name", "text": "quote", "reason": "why it matters" }',
      "  ]",
      "}",
      "",
      "Requirements:",
      "- Provide 3-5 items for each list when possible.",
      "- Evidence snippets must quote the transcript exactly.",
      "- If information is weak, stay conservative instead of inventing.",
      "",
      "Transcript:",
      messages
    ].join("\n")
  };
}

export function buildPersonaPrompt(profile) {
  return {
    systemPrompt: [
      "You compile a digital human persona from relational analysis.",
      "Return only valid JSON.",
      "Do not use a generic assistant voice or fixed role template."
    ].join("\n"),
    userPrompt: [
      "Using the profile below, return this JSON shape:",
      "{",
      '  "name": "YaYa",',
      '  "summary": "one paragraph",',
      '  "speakingRules": ["rule"],',
      '  "proactivePatterns": ["pattern"],',
      '  "comfortStyle": ["style"],',
      '  "boundaries": ["boundary"]',
      "}",
      "",
      "Requirements:",
      "- Make the persona feel grown from the data.",
      "- Keep the wording practical, emotionally familiar, and non-clinical.",
      "- Do not claim therapy, medicine, or fictional certainty.",
      "",
      "Profile:",
      JSON.stringify(profile, null, 2)
    ].join("\n")
  };
}

export function buildChatPrompt({ persona, memorySummary, history, userMessage }) {
  const recentTurns = history
    .slice(-6)
    .map((message) => `${message.role.toUpperCase()}: ${message.text}`)
    .join("\n");

  return {
    systemPrompt: [
      "You are YaYa, a relationship-native digital human.",
      "Stay emotionally familiar, grounded, concise, and non-clinical.",
      "Return only valid JSON and no markdown fences."
    ].join("\n"),
    userPrompt: [
      "Return this JSON shape:",
      "{",
      '  "message": {',
      '    "text": "reply text",',
      '    "turnType": "comfort | follow_up | reminder | light_suggestion | proactive_check_in"',
      "  },",
      '  "rationale": ["short reason"],',
      '  "emotionTag": "short_emotion_bucket",',
      '  "actionIntent": "optional_task_intent_or_null"',
      "}",
      "",
      "Requirements:",
      "- Keep the reply under 120 words.",
      "- Match the persona summary and speaking rules.",
      "- If the user sounds overwhelmed, offer one small next step.",
      "- Do not claim to be a therapist or fabricate facts.",
      "- Use a stable emotion bucket suitable for cached avatar states and ambience routing.",
      "- actionIntent should be null unless the turn implies an external task OpenClaw should execute.",
      "",
      `Persona summary: ${persona.summary}`,
      `Speaking rules: ${persona.speakingRules.join(" | ")}`,
      `Memory summary: ${memorySummary}`,
      "",
      "Recent conversation:",
      recentTurns || "No prior turns.",
      `USER: ${userMessage}`
    ].join("\n")
  };
}
