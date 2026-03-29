import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFilePath = fileURLToPath(import.meta.url);
const serviceRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
const workspaceRoot = path.resolve(serviceRoot, "..", "..");

function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) {
    return;
  }

  const parsed = dotenv.parse(fs.readFileSync(envPath));

  if (!parsed) {
    return;
  }

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string" || value.length === 0) {
      continue;
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(workspaceRoot, ".env"));
loadEnvFile(path.join(workspaceRoot, ".env.local"));
loadEnvFile(path.join(serviceRoot, ".env"));

export function getConfig() {
  const configuredSpeechMode = String(process.env.GEMINI_SPEECH_MODE ?? "tts").toLowerCase();
  const configuredDynamicImageModel = String(
    process.env.GEMINI_DYNAMIC_IMAGE_MODEL ?? "gemini-2.5-flash-image"
  ).trim();
  const geminiDynamicImageModel =
    configuredDynamicImageModel.startsWith("AIza")
      ? "gemini-2.5-flash-image"
      : configuredDynamicImageModel;

  return {
    port: Number(process.env.PORT ?? 8787),
    minimaxApiKey: process.env.MINIMAX_API_KEY,
    minimaxBaseUrl: process.env.MINIMAX_BASE_URL ?? "https://api.minimax.io/v1",
    textModel: process.env.MINIMAX_TEXT_MODEL ?? "MiniMax-M2.7",
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiBaseUrl:
      process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com",
    configuredGeminiSpeechMode: configuredSpeechMode,
    geminiSpeechMode: "tts",
    geminiTtsModel: process.env.GEMINI_TTS_MODEL ?? "gemini-2.5-flash-preview-tts",
    geminiLiveModel: process.env.GEMINI_LIVE_MODEL ?? "",
    geminiTtsVoiceName: process.env.GEMINI_TTS_VOICE_NAME ?? "Kore",
    geminiTtsSampleRateHz: Number(process.env.GEMINI_TTS_SAMPLE_RATE_HZ ?? 24000),
    imagenModel: process.env.IMAGEN_MODEL ?? "imagen-4.0-generate-001",
    geminiDynamicImageModel,
    lyriaModel: process.env.LYRIA_MODEL ?? "Lyria 3 Clip",
    openClawSharedSecret: process.env.OPENCLAW_SHARED_SECRET ?? "",
    localAgentUrl: process.env.YAYA_LOCAL_AGENT_URL ?? "http://127.0.0.1:8791",
    allowMockFallback: String(process.env.YAYA_ALLOW_MOCK_FALLBACK ?? "false").toLowerCase() === "true",
    sqlitePath:
      process.env.YAYA_SQLITE_PATH ?? path.join(workspaceRoot, "data", "yaya.sqlite")
  };
}
