import {
  sampleAvatar,
  sampleMessages,
  samplePersona,
  sampleProfile,
  buildSampleReply
} from "@/lib/demo-data";
import { normalizeImportInput as normalizeImportInputLocally } from "@/lib/import-normalizers";
import type {
  AgentSkill,
  AmbienceLoop,
  ApiErrorPayload,
  ChatMessage,
  DiscordImportTargetListResult,
  ExpressionState,
  ImportFileNormalizationRequest,
  ImportNormalizationRequest,
  ImportNormalizationResult,
  LocalAgentScanResult,
  OpenClawDiscordStatus,
  PersonaCard,
  ProactiveCheckResult,
  RelationalProfile,
  VisualFrame,
  SpeechSynthesisResult
} from "@/types/yaya";

function getBackendUrl() {
  return process.env.YAYA_BACKEND_URL ?? "http://localhost:8787";
}

function getLocalAgentUrl() {
  return process.env.YAYA_LOCAL_AGENT_URL ?? "http://127.0.0.1:8791";
}

export class BackendProxyError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, options: { code: string; status: number; details?: unknown }) {
    super(message);
    this.name = "BackendProxyError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

async function safeJsonFetch<T>(
  path: string,
  init: RequestInit,
  fallback?: T,
  timeoutMs?: number
): Promise<T> {
  const controller = new AbortController();
  const timeout =
    typeof timeoutMs === "number" && timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;

  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      },
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;

      if (fallback !== undefined) {
        return fallback;
      }

      throw new BackendProxyError(
        payload?.error?.message ?? `Backend request failed with status ${response.status}.`,
        {
          code: payload?.error?.code ?? "backend_request_failed",
          status: response.status,
          details: payload?.error?.details
        }
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (fallback !== undefined) {
      return fallback;
    }

    if (error instanceof BackendProxyError) {
      throw error;
    }

    const details =
      error instanceof Error && error.name === "AbortError"
        ? "The backend request timed out."
        : error instanceof Error
          ? error.message
          : String(error);

    throw new BackendProxyError("Failed to reach the YaYa backend service.", {
      code: "backend_unreachable",
      status: 502,
      details
    });
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function toApiErrorResponse(error: unknown) {
  if (error instanceof BackendProxyError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "proxy_unknown_error",
        message: "Unexpected proxy error."
      }
    }
  };
}

export async function fetchBackendHealth() {
  return safeJsonFetch<{
    ok: boolean;
    service: string;
    models: Record<string, string | boolean>;
    openClawSecretConfigured: boolean;
  }>("/health", { method: "GET" });
}

export async function fetchLocalAgentScan(source: "discord" | "wechat") {
  try {
    const response = await fetch(`${getLocalAgentUrl()}/v1/scan/${source === "discord" ? "discord-exports" : "wechat-dbs"}`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      throw new BackendProxyError(
        payload?.error?.message ?? `Local agent request failed with status ${response.status}.`,
        {
          code: payload?.error?.code ?? "local_agent_request_failed",
          status: response.status,
          details: payload?.error?.details
        }
      );
    }

    return (await response.json()) as LocalAgentScanResult;
  } catch (error) {
    if (error instanceof BackendProxyError) {
      throw error;
    }

    throw new BackendProxyError("Failed to reach the YaYa local agent.", {
      code: "local_agent_unreachable",
      status: 502,
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function fetchDiscordImportTargets() {
  try {
    const response = await fetch(`${getLocalAgentUrl()}/v1/discord/targets`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      throw new BackendProxyError(
        payload?.error?.message ?? `Discord target request failed with status ${response.status}.`,
        {
          code: payload?.error?.code ?? "discord_targets_failed",
          status: response.status,
          details: payload?.error?.details
        }
      );
    }

    return (await response.json()) as DiscordImportTargetListResult;
  } catch (error) {
    if (error instanceof BackendProxyError) {
      throw error;
    }

    throw new BackendProxyError("Failed to reach the YaYa local agent.", {
      code: "local_agent_unreachable",
      status: 502,
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function exportDiscordHistory(input: {
  channelId: string;
  format?: "Json" | "Csv" | "PlainText";
}) {
  try {
    const response = await fetch(`${getLocalAgentUrl()}/v1/discord/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input),
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      throw new BackendProxyError(
        payload?.error?.message ?? `Discord export failed with status ${response.status}.`,
        {
          code: payload?.error?.code ?? "discord_export_failed",
          status: response.status,
          details: payload?.error?.details
        }
      );
    }

    return (await response.json()) as {
      exporterPath: string;
      outputPath: string;
      stdout: string;
      stderr: string;
    };
  } catch (error) {
    if (error instanceof BackendProxyError) {
      throw error;
    }

    throw new BackendProxyError("Failed to reach the YaYa local agent.", {
      code: "local_agent_unreachable",
      status: 502,
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function fetchOpenClawDiscordStatus() {
  try {
    const response = await fetch(`${getLocalAgentUrl()}/v1/openclaw/discord/status`, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      throw new BackendProxyError(
        payload?.error?.message ?? `OpenClaw status request failed with status ${response.status}.`,
        {
          code: payload?.error?.code ?? "openclaw_status_failed",
          status: response.status,
          details: payload?.error?.details
        }
      );
    }

    return (await response.json()) as OpenClawDiscordStatus;
  } catch (error) {
    if (error instanceof BackendProxyError) {
      throw error;
    }

    throw new BackendProxyError("Failed to reach the YaYa local agent.", {
      code: "local_agent_unreachable",
      status: 502,
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function connectOpenClawDiscord(input: { token?: string }) {
  try {
    const response = await fetch(`${getLocalAgentUrl()}/v1/openclaw/discord/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(input),
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      throw new BackendProxyError(
        payload?.error?.message ?? `OpenClaw connect request failed with status ${response.status}.`,
        {
          code: payload?.error?.code ?? "openclaw_connect_failed",
          status: response.status,
          details: payload?.error?.details
        }
      );
    }

    return (await response.json()) as OpenClawDiscordStatus;
  } catch (error) {
    if (error instanceof BackendProxyError) {
      throw error;
    }

    throw new BackendProxyError("Failed to reach the YaYa local agent.", {
      code: "local_agent_unreachable",
      status: 502,
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function startOpenClawGateway() {
  try {
    const response = await fetch(`${getLocalAgentUrl()}/v1/openclaw/gateway/start`, {
      method: "POST",
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      throw new BackendProxyError(
        payload?.error?.message ?? `OpenClaw gateway start failed with status ${response.status}.`,
        {
          code: payload?.error?.code ?? "openclaw_gateway_start_failed",
          status: response.status,
          details: payload?.error?.details
        }
      );
    }

    return (await response.json()) as { started: boolean };
  } catch (error) {
    if (error instanceof BackendProxyError) {
      throw error;
    }

    throw new BackendProxyError("Failed to reach the YaYa local agent.", {
      code: "local_agent_unreachable",
      status: 502,
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function fetchImportRows() {
  return safeJsonFetch(
    "/v1/import",
    { method: "GET" },
    {
      sources: ["wechat", "discord"],
      rows: sampleMessages
    }
  );
}

export async function fetchImportNormalization(
  input: ImportNormalizationRequest
): Promise<ImportNormalizationResult> {
  try {
    return await safeJsonFetch<ImportNormalizationResult>("/v1/import/normalize", {
      method: "POST",
      body: JSON.stringify(input)
    });
  } catch (error) {
    if (error instanceof BackendProxyError && error.code === "backend_unreachable") {
      return normalizeImportInputLocally(input);
    }

    throw error;
  }
}

export async function fetchImportFileNormalization(
  input: ImportFileNormalizationRequest
): Promise<ImportNormalizationResult> {
  return safeJsonFetch<ImportNormalizationResult>("/v1/import/file", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function saveGeneratedSession(input: {
  id?: string;
  sourceText: string;
  source: string;
  importFormat: string;
  threadId: string;
  normalizedMessages: unknown[];
  speakers: string[];
  profile: RelationalProfile;
  persona: PersonaCard;
  avatar: typeof sampleAvatar;
  avatarModel: string;
  createdAt: string;
}) {
  return safeJsonFetch("/v1/sessions", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchLatestGeneratedSession() {
  return safeJsonFetch("/v1/sessions/latest", {
    method: "GET"
  });
}

export async function fetchAnalysis(transcript: string, allowFallback = false) {
  return safeJsonFetch<RelationalProfile>(
    "/v1/analysis",
    {
      method: "POST",
      body: JSON.stringify({ transcript })
    },
    allowFallback ? sampleProfile : undefined,
    allowFallback ? 8000 : undefined
  );
}

export async function fetchPersona(profile: RelationalProfile, allowFallback = false) {
  return safeJsonFetch(
    "/v1/persona",
    {
      method: "POST",
      body: JSON.stringify({ profile })
    },
    allowFallback ? samplePersona : undefined,
    allowFallback ? 8000 : undefined
  );
}

export async function fetchAvatar() {
  return safeJsonFetch(
    "/v1/avatar",
    { method: "GET" },
    {
      avatar: sampleAvatar,
      model: "imagen-4.0-generate-001"
    }
  );
}

export async function fetchChatReply(input: {
  userMessage: string;
  history: ChatMessage[];
  persona: PersonaCard;
  profile?: RelationalProfile;
  memorySummary: string;
  activeSkills?: AgentSkill[];
}) {
  return safeJsonFetch(
    "/v1/chat",
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    undefined
  );
}

export async function fetchSpeech(input: {
  text?: string;
  message?: { text?: string };
  emotionTag?: string;
  voiceName?: string;
}) {
  return safeJsonFetch<SpeechSynthesisResult>("/v1/speech", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchExpression(input: { emotionTag?: string }) {
  return safeJsonFetch<ExpressionState>("/v1/expression", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchAmbience(input: { emotionTag?: string }) {
  return safeJsonFetch<AmbienceLoop>("/v1/ambience", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function fetchVisualFrame(input: {
  persona: PersonaCard;
  profile: RelationalProfile;
  avatarPrompt: string;
  emotionTag?: string;
  latestUserMessage?: string;
  latestAssistantMessage?: string;
}) {
  return safeJsonFetch<VisualFrame>("/v1/visual", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function checkProactiveState(input: {
  session: unknown;
  timezone?: string;
  nowIso?: string;
}) {
  return safeJsonFetch<ProactiveCheckResult>("/v1/proactive/check", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getDevelopmentChatFallback(userMessage: string) {
  return buildSampleReply(userMessage);
}
