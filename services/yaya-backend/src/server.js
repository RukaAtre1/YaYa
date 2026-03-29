import cors from "cors";
import express from "express";
import { sampleMessages, sampleProfile, samplePersona } from "./sample-data.js";
import { analyzeRelationalData } from "./services/analysis-service.js";
import { buildAvatarProfile } from "./services/avatar-service.js";
import { resolveAmbienceLoop } from "./services/ambience-service.js";
import { runDialogue } from "./services/chat-service.js";
import { getConfig } from "./services/config.js";
import { resolveExpressionState } from "./services/expression-service.js";
import { synthesizeGeminiSpeech } from "./services/gemini-speech-service.js";
import { generateGeminiVisualFrame } from "./services/gemini-visual-service.js";
import { normalizeImportFile } from "./services/import-file-service.js";
import { getImportCapabilities, normalizeImportPayload } from "./services/import-normalizer.js";
import { normalizeError, ServiceError } from "./services/errors.js";
import { summarizeMemory } from "./services/memory-service.js";
import { getModelManifest } from "./services/minimax-client.js";
import { compilePersona } from "./services/persona-service.js";
import {
  getGeneratedSessionById,
  getLatestGeneratedSession,
  getSessionStoreStatus,
  saveGeneratedSession
} from "./services/session-store.js";

const app = express();
const config = getConfig();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

function enforceOpenClawSecret(request, _response, next) {
  if (!config.openClawSharedSecret) {
    next();
    return;
  }

  const suppliedSecret = request.header("x-openclaw-secret");

  if (suppliedSecret !== config.openClawSharedSecret) {
    next(
      new ServiceError("OpenClaw shared secret is invalid.", {
        status: 401,
        code: "openclaw_secret_invalid"
      })
    );
    return;
  }

  next();
}

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "yaya-backend",
    models: getModelManifest(),
    openClawSecretConfigured: Boolean(config.openClawSharedSecret),
    storage: getSessionStoreStatus()
  });
});

app.get("/v1/import", (_request, response) => {
  response.json(getImportCapabilities());
});

app.post("/v1/import/normalize", (request, response, next) => {
  try {
    response.json(normalizeImportPayload(request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.post("/v1/import/file", async (request, response, next) => {
  try {
    response.json(await normalizeImportFile(request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.post("/v1/sessions", (request, response, next) => {
  try {
    response.json(saveGeneratedSession(request.body ?? {}));
  } catch (error) {
    next(error);
  }
});

app.get("/v1/sessions/latest", (_request, response, next) => {
  try {
    const session = getLatestGeneratedSession();

    if (!session) {
      throw new ServiceError("No generated session has been saved yet.", {
        status: 404,
        code: "session_not_found"
      });
    }

    response.json(session);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/analysis", async (request, response, next) => {
  try {
    const transcript = request.body?.transcript ?? "";
    const profile = await analyzeRelationalData(transcript);
    response.json(profile);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/persona", async (request, response, next) => {
  try {
    const profile = request.body?.profile ?? sampleProfile;
    const persona = await compilePersona(profile);
    response.json(persona);
  } catch (error) {
    next(error);
  }
});

app.get("/v1/avatar", async (_request, response, next) => {
  try {
    const avatar = await buildAvatarProfile();
    response.json({
      avatar,
      model: getModelManifest().staticAvatarModel
    });
  } catch (error) {
    next(error);
  }
});

app.post("/v1/chat", async (request, response, next) => {
  try {
    const reply = await runDialogue({
      userMessage: request.body?.userMessage ?? "",
      history: request.body?.history ?? [],
      persona: request.body?.persona ?? samplePersona,
      memorySummary: request.body?.memorySummary ?? summarizeMemory()
    });

    response.json(reply);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/speech", async (request, response, next) => {
  try {
    const payload = await synthesizeGeminiSpeech(request.body ?? {});
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/expression", async (request, response, next) => {
  try {
    const payload = await resolveExpressionState(request.body ?? {});
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/ambience", async (request, response, next) => {
  try {
    const payload = await resolveAmbienceLoop(request.body ?? {});
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/visual", async (request, response, next) => {
  try {
    const payload = await generateGeminiVisualFrame(request.body ?? {});
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post("/v1/openclaw/message", enforceOpenClawSecret, async (request, response, next) => {
  try {
    const incoming = request.body ?? {};
    const activeSession =
      (incoming.sessionId ? getGeneratedSessionById(incoming.sessionId) : null) ??
      getLatestGeneratedSession();
    const history = Array.isArray(activeSession?.liveMessages)
      ? activeSession.liveMessages
      : Array.isArray(incoming.history)
        ? incoming.history
        : [];
    const persona = incoming.persona ?? activeSession?.persona ?? samplePersona;
    const profile = incoming.profile ?? activeSession?.profile ?? sampleProfile;
    const memorySummary = incoming.memorySummary ?? activeSession?.memorySummary ?? summarizeMemory({
      profile,
      persona,
      history,
      userMessage: incoming.text ?? ""
    });
    const activeSkills = incoming.activeSkills ?? activeSession?.activeSkills ?? [];

    const reply = await runDialogue({
      userMessage: incoming.text ?? "",
      history,
      persona,
      profile,
      memorySummary,
      activeSkills
    });

    if (activeSession) {
      saveGeneratedSession({
        ...activeSession,
        memorySummary: reply.memorySummary ?? memorySummary,
        activeSkills: reply.activeSkills ?? activeSkills,
        liveMessages: [
          ...history,
          {
            id: `openclaw-user-${Date.now()}`,
            role: "user",
            text: incoming.text ?? "",
            timestamp: new Date().toISOString()
          },
          reply.message
        ].slice(-24)
      });
    }

    response.json({
      channel: incoming.channel ?? "openclaw",
      userId: incoming.userId ?? "unknown",
      reply
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  const normalized = normalizeError(error);
  response.status(normalized.status).json({
    error: {
      code: normalized.code,
      message: normalized.message,
      details: normalized.details
    }
  });
});

app.listen(config.port, () => {
  console.log(`YaYa backend listening on http://localhost:${config.port}`);
});
