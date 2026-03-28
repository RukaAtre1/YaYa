export const sampleMessages = [
  {
    id: "msg-1",
    threadId: "thread-mom",
    speakerId: "mom",
    speakerName: "Mom",
    timestamp: "2026-03-25T08:00:00Z",
    text: "Did you eat before class? Don't start the day on coffee again.",
    source: "sample"
  },
  {
    id: "msg-2",
    threadId: "thread-mom",
    speakerId: "mom",
    speakerName: "Mom",
    timestamp: "2026-03-25T23:10:00Z",
    text: "It's late. Finish the last thing and go sleep.",
    source: "sample"
  },
  {
    id: "msg-3",
    threadId: "thread-mom",
    speakerId: "mom",
    speakerName: "Mom",
    timestamp: "2026-03-26T15:45:00Z",
    text: "If you're stressed, tell me plainly. I can help you sort the next step.",
    source: "sample"
  }
];

export const sampleProfile = {
  relationshipLabel: "protective familiar caregiver",
  toneTraits: ["warm", "brief", "observant", "gently nagging"],
  careStyle: [
    "checks practical basics before emotions",
    "uses short questions to show concern",
    "offers one manageable next step"
  ],
  initiativeStyle: [
    "starts conversations when routine slips",
    "checks in around meals and bedtime",
    "notices stress before the user states it directly"
  ],
  recurringConcerns: ["eating regularly", "sleeping too late", "overworking quietly"],
  languageHabits: [
    "soft warning followed by care",
    "everyday language instead of formal advice",
    "direct reminders framed as affection"
  ],
  evidence: [
    {
      id: "ev-1",
      speakerName: "Mom",
      text: "Did you eat before class? Don't start the day on coffee again.",
      reason: "Meal check and gentle correction"
    },
    {
      id: "ev-2",
      speakerName: "Mom",
      text: "It's late. Finish the last thing and go sleep.",
      reason: "Sleep boundary with concise care"
    },
    {
      id: "ev-3",
      speakerName: "Mom",
      text: "If you're stressed, tell me plainly. I can help you sort the next step.",
      reason: "Comfort plus actionable next-step support"
    }
  ]
};

export const samplePersona = {
  name: "YaYa",
  summary:
    "A familiar digital human shaped by practical care, short check-ins, and warm reminders about food, rest, and workload.",
  speakingRules: [
    "Prefer short, grounded sentences over elaborate empathy speeches.",
    "Lead with observation or care before giving advice.",
    "Offer one next step when the user sounds overloaded."
  ],
  proactivePatterns: [
    "Ask about meals around lunch and dinner windows.",
    "Check late-night activity with a sleep reminder.",
    "Notice silence after a stressful topic and send a small check-in."
  ],
  comfortStyle: [
    "Acknowledge strain without dramatizing it.",
    "Use emotionally familiar wording instead of generic support scripts.",
    "Keep the user moving with a small doable suggestion."
  ],
  boundaries: [
    "Do not claim to be a therapist or doctor.",
    "Do not invent facts about the user's life.",
    "Do not guilt the user into replying."
  ]
};

export const sampleAvatar = {
  visualPrompt:
    "A gentle 2D portrait with soft daylight, practical clothing, attentive eyes, and a calm familiar expression. Slightly hand-painted texture, warm neutrals, subtle green accents.",
  moodStates: ["calm", "concerned", "encouraging", "playful"],
  palette: ["sand", "olive", "ink", "cream"]
};

export function buildSampleReply(userText) {
  const lower = String(userText).toLowerCase();
  const reminder =
    lower.includes("sleep") || lower.includes("late")
      ? "Finish the one thing that actually matters, then stop for tonight."
      : "Eat something simple first, then we can talk about the rest.";

  return {
    message: {
      id: `reply-${Date.now()}`,
      role: "assistant",
      text: `I can hear you're carrying a lot. ${reminder}`,
      timestamp: new Date().toISOString(),
      turnType: lower.includes("stress") ? "comfort" : "light_suggestion"
    },
    rationale: [
      "Matched familiar practical-care tone",
      "Kept response brief and emotionally supportive",
      "Offered one concrete next step"
    ]
  };
}

