import {
  sampleAvatar,
  sampleMessages,
  samplePersona,
  sampleProfile,
  buildSampleReply
} from "@/lib/demo-data";
import type {
  AmbienceLoop,
  ApiErrorPayload,
  ChatMessage,
  ExpressionState,
  PersonaCard,
  RelationalProfile,
  SpeechSynthesisResult
} from "@/types/yaya";

function getBackendUrl() {
  return process.env.YAYA_BACKEND_URL ?? "http://localhost:8787";
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

async function safeJsonFetch<T>(path: string, init: RequestInit, fallback?: T): Promise<T> {
  try {
    const response = await fetch(`${getBackendUrl()}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      },
      cache: "no-store"
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

    throw new BackendProxyError("Failed to reach the YaYa backend service.", {
      code: "backend_unreachable",
      status: 502,
      details: error instanceof Error ? error.message : String(error)
    });
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

export async function fetchAnalysis(transcript: string, allowFallback = false) {
  return safeJsonFetch<RelationalProfile>(
    "/v1/analysis",
    {
      method: "POST",
      body: JSON.stringify({ transcript })
    },
    allowFallback ? sampleProfile : undefined
  );
}

export async function fetchPersona(profile: RelationalProfile, allowFallback = false) {
  return safeJsonFetch(
    "/v1/persona",
    {
      method: "POST",
      body: JSON.stringify({ profile })
    },
    allowFallback ? samplePersona : undefined
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
  memorySummary: string;
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

export function getDevelopmentChatFallback(userMessage: string) {
  return buildSampleReply(userMessage);
}
