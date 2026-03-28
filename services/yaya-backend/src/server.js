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
import { normalizeError, ServiceError } from "./services/errors.js";
import { summarizeMemory } from "./services/memory-service.js";
import { getModelManifest } from "./services/minimax-client.js";
import { compilePersona } from "./services/persona-service.js";

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
    openClawSecretConfigured: Boolean(config.openClawSharedSecret)
  });
});

app.get("/v1/import", (_request, response) => {
  response.json({
    sources: ["wechat", "discord"],
    rows: sampleMessages
  });
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

app.post("/v1/openclaw/message", enforceOpenClawSecret, async (request, response, next) => {
  try {
    const incoming = request.body ?? {};

    const reply = await runDialogue({
      userMessage: incoming.text ?? "",
      history: incoming.history ?? [],
      persona: incoming.persona ?? samplePersona,
      memorySummary: summarizeMemory()
    });

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
