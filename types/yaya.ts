export type SupportedSource = "wechat" | "discord" | "sample";

export type ImportFormat =
  | "discord_json"
  | "discord_exporter_json"
  | "discord_exporter_csv"
  | "discord_transcript"
  | "wechat_transcript"
  | "wechat_history_sqlite"
  | "sample_transcript";

export type MessageRecord = {
  id: string;
  threadId: string;
  speakerId: string;
  speakerName: string;
  timestamp: string;
  text: string;
  source: SupportedSource;
};

export type ImportNormalizationRequest = {
  source: SupportedSource;
  rawInput: string;
  fileName?: string;
};

export type ImportFileNormalizationRequest = {
  source: SupportedSource;
  filePath: string;
  fileName?: string;
  contactName?: string;
  contactId?: string;
  listContacts?: boolean;
};

export type WeChatContact = {
  user_name: string;
  display_name: string;
};

export type WeChatContactListResult = {
  contacts: WeChatContact[];
};

export type ImportNormalizationResult = {
  source: SupportedSource;
  detectedFormat: ImportFormat;
  threadId: string;
  transcript: string;
  rows: MessageRecord[];
  speakers: string[];
  warnings: string[];
};

export type LocalAgentFileRecord = {
  path: string;
  fileName: string;
  sizeBytes: number;
  modifiedAt: string | null;
};

export type LocalAgentScanResult = {
  source: "discord" | "wechat";
  files: LocalAgentFileRecord[];
};

export type DiscordImportTarget = {
  id: string;
  kind: "dm" | "guild_channel";
  name: string;
  label: string;
  guildId?: string;
  guildName?: string;
};

export type DiscordImportTargetListResult = {
  targets: DiscordImportTarget[];
};

export type OpenClawDiscordStatus = {
  gatewayReachable: boolean;
  bridgeLoaded: boolean;
  discordConfigured: boolean;
  discordConnected: boolean;
  channelStatusLine: string;
  rawChannelsStatus: string;
  rawPluginsStatus: string;
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

export type AgentSkill = {
  id: string;
  label: string;
  description: string;
};

export type ProactiveRoutine = {
  id: string;
  label: string;
  kind: "study" | "water" | "sleep";
  enabled: boolean;
  hour?: number;
  minute?: number;
  intervalMinutes?: number;
  startHour?: number;
  endHour?: number;
};

export type ProactiveState = {
  timezone: string;
  routines: ProactiveRoutine[];
  lastTriggeredAtByRoutine: Record<string, string>;
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
  memorySummary?: string;
  activeSkills?: AgentSkill[];
};

export type ProactiveCheckResult = {
  triggered: boolean;
  routineId?: string;
  reply?: ChatReply;
  proactiveState?: ProactiveState;
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

export type VisualFrame = {
  imageDataUri: string;
  mimeType: string;
  model: string;
  prompt: string;
  stateLabel: string;
  revision: string;
  source: string;
};

export type RuntimeCapabilityState = "ready" | "limited" | "offline";

export type RuntimeCapability = {
  state: RuntimeCapabilityState;
  label: string;
  detail: string;
};

export type BackendHealth = {
  ok: boolean;
  service: string;
  models: Record<string, string | boolean | null>;
  openClawSecretConfigured: boolean;
  realtime: {
    backend: RuntimeCapability;
    discordHistory: RuntimeCapability;
    discordBridge: RuntimeCapability;
    discordRelay: RuntimeCapability;
    wechatImport: RuntimeCapability;
  };
};

export type GeneratedVirtualHumanSession = {
  id?: string;
  sourceText: string;
  source: SupportedSource;
  importFormat: ImportFormat;
  threadId: string;
  normalizedMessages: MessageRecord[];
  speakers: string[];
  discordTarget?: {
    speakerId: string;
    speakerName: string;
    threadId: string;
  } | null;
  profile: RelationalProfile;
  persona: PersonaCard;
  avatar: AvatarProfile;
  avatarModel: string;
  memorySummary?: string;
  activeSkills?: AgentSkill[];
  liveMessages?: ChatMessage[];
  proactiveState?: ProactiveState;
  createdAt: string;
};

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};
