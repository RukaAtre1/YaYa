export type SupportedSource = "wechat" | "discord" | "sample";

export type MessageRecord = {
  id: string;
  threadId: string;
  speakerId: string;
  speakerName: string;
  timestamp: string;
  text: string;
  source: SupportedSource;
};

export type EvidenceSnippet = {
  id: string;
  speakerName: string;
  text: string;
  reason: string;
};

export type RelationalProfile = {
  relationshipLabel: string;
  toneTraits: string[];
  careStyle: string[];
  initiativeStyle: string[];
  recurringConcerns: string[];
  languageHabits: string[];
  evidence: EvidenceSnippet[];
};

export type PersonaCard = {
  name: string;
  summary: string;
  speakingRules: string[];
  proactivePatterns: string[];
  comfortStyle: string[];
  boundaries: string[];
};

export type AvatarProfile = {
  visualPrompt: string;
  moodStates: string[];
  palette: string[];
};

export type ChatTurnType =
  | "comfort"
  | "follow_up"
  | "reminder"
  | "light_suggestion"
  | "proactive_check_in";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  turnType?: ChatTurnType;
};

export type ChatReply = {
  message: ChatMessage;
  rationale: string[];
  emotionTag?: string;
  actionIntent?: string | null;
};

export type SpeechSynthesisResult = {
  ok: boolean;
  status: string;
  speechPath: "Gemini TTS";
  source: string;
  model: string;
  input: {
    text: string;
    emotionTag: string;
    voiceName: string;
  };
  audio: {
    mimeType: string;
    data: string;
    encoding: string;
    channels: number;
    sampleRateHz: number;
    durationMs: number;
    byteLength: number;
  };
  rawAudio: {
    mimeType: string;
  };
};

export type ExpressionState = {
  emotionTag: string;
  cachedState: string;
  assetLayer: string;
  staticAvatarModel: string;
  dynamicUpdatesEnabled: boolean;
  optionalDynamicExpressionModel: string | null;
  source: string;
};

export type AmbienceLoop = {
  emotionTag: string;
  moodBucket: string;
  switchPerTurn: boolean;
  layer: string;
  model: string;
  source: string;
};

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
