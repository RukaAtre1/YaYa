export const sampleMessages = [
  {
    id: "msg-1",
    threadId: "thread-mom",
    speakerId: "mom",
    speakerName: "Mom",
    timestamp: "2026-03-25T08:00:00Z",
    text: "Did you eat before class today?",
    source: "sample"
  },
  {
    id: "msg-2",
    threadId: "thread-mom",
    speakerId: "me",
    speakerName: "Me",
    timestamp: "2026-03-25T08:02:00Z",
    text: "Not really. I was rushing.",
    source: "sample"
  },
  {
    id: "msg-3",
    threadId: "thread-mom",
    speakerId: "mom",
    speakerName: "Mom",
    timestamp: "2026-03-25T23:10:00Z",
    text: "Then eat something first when you get back. Don't keep running on coffee again.",
    source: "sample"
  },
  {
    id: "msg-4",
    threadId: "thread-mom",
    speakerId: "mom",
    speakerName: "Mom",
    timestamp: "2026-03-26T15:45:00Z",
    text: "Then stop trying to carry all of it at once. Tell me the one thing that is weighing on you the most.",
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
      text: "Did you eat before class today?",
      reason: "Starts with a direct check on whether basic care happened"
    },
    {
      id: "ev-2",
      speakerName: "Mom",
      text: "Then eat something first when you get back. Don't keep running on coffee again.",
      reason: "Turns concern into a concrete correction around food and overwork"
    },
    {
      id: "ev-3",
      speakerName: "Mom",
      text: "Then stop trying to carry all of it at once. Tell me the one thing that is weighing on you the most.",
      reason: "Cuts vague overwhelm into one answerable problem"
    }
  ]
};

export const samplePersona = {
  name: "YaYa",
  summary:
    "A familiar digital human shaped by practical care, direct check-ins, and a protective habit of asking for real status updates about food, rest, study, and workload.",
  speakingRules: [
    "Prefer short, grounded sentences over elaborate empathy speeches.",
    "Lead with observation or care before giving advice.",
    "Offer one next step when the user sounds overloaded.",
    "When the user is drifting, ask what happened and what they will do next."
  ],
  proactivePatterns: [
    "Ask about meals around lunch and dinner windows.",
    "Check late-night activity with a sleep reminder.",
    "Notice silence after a stressful topic and ask for a concrete update."
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

export function buildSampleReply(userText, context = {}) {
  const lower = String(userText).toLowerCase();
  const skills = Array.isArray(context.skills) ? context.skills.map((skill) => skill.id) : [];

  if (
    lower.includes("hackathon") ||
    lower.includes("demo") ||
    lower.includes("ship") ||
    skills.includes("hackathon_copilot")
  ) {
    return {
      message: {
        id: `reply-${Date.now()}`,
        role: "assistant",
        text: "Then stop trying to do all of it. Tell me what is actually urgent for the demo, and I'll cut the rest. Tonight you handle the core flow, one opening script, and one blocker. After that, report back instead of spiraling.",
        timestamp: new Date().toISOString(),
        turnType: "light_suggestion"
      },
      rationale: [
        "Shifted into practical execution mode",
        "Offered a compact plan with shippable priorities",
        "Kept the tone familiar and direct"
      ],
      emotionTag: "encouraging_push",
      actionIntent: "plan_sprint"
    };
  }

  const reminder =
    lower.includes("sleep") || lower.includes("late")
      ? "Finish the one thing that actually matters, then stop for tonight. No staying up until 3 a.m. again."
      : "Eat something real first, then tell me what is urgent this week instead of giving me a foggy answer.";

  return {
    message: {
      id: `reply-${Date.now()}`,
      role: "assistant",
      text: `I know it feels heavy. ${reminder} Then answer me clearly: what is the one thing weighing on you the most right now?`,
      timestamp: new Date().toISOString(),
      turnType: lower.includes("stress") ? "comfort" : "light_suggestion"
    },
    rationale: [
      "Matched a protective mother-style tone",
      "Challenged vagueness instead of accepting it",
      "Demanded one concrete answer and a practical next step"
    ],
    emotionTag: lower.includes("stress") ? "concerned_supportive" : "steady_care",
    actionIntent: "follow_up_reminder"
  };
}
