import { NextResponse } from "next/server";
import { access } from "node:fs/promises";
import path from "node:path";
import { fetchBackendHealth } from "@/lib/yaya-backend";
import type { BackendHealth, RuntimeCapability } from "@/types/yaya";

function createCapability(state: RuntimeCapability["state"], label: string, detail: string): RuntimeCapability {
  return { state, label, detail };
}

async function getBridgePluginAvailability() {
  const pluginPath = path.join(
    process.cwd(),
    "openclaw-plugins",
    "yaya-discord-bridge",
    "openclaw.plugin.json"
  );

  try {
    await access(pluginPath);
    return true;
  } catch {
    return false;
  }
}

export async function GET() {
  const pluginAvailable = await getBridgePluginAvailability();

  try {
    const health = await fetchBackendHealth();

    const response: BackendHealth = {
      ...health,
      realtime: {
        backend: createCapability(
          "ready",
          "Backend connected",
          "MiniMax M2.7 is the active brain for analysis, persona, and live replies."
        ),
        discordHistory: createCapability(
          "ready",
          "Discord history import ready",
          "Paste or upload Discord transcript text or a JSON message array during setup."
        ),
        discordBridge: createCapability(
          pluginAvailable ? "ready" : "limited",
          pluginAvailable ? "Bridge plugin available" : "Bridge plugin not found",
          pluginAvailable
            ? "OpenClaw can relay Discord traffic through the YaYa backend shell."
            : "The product copy is ready, but the local Discord bridge plugin is missing."
        ),
        discordRelay: createCapability(
          pluginAvailable ? "ready" : "limited",
          pluginAvailable ? "Realtime relay ready" : "Realtime relay needs plugin link",
          pluginAvailable
            ? "Discord is the primary realtime channel. OpenClaw stays behind the scenes."
            : "Discord history import works now. Realtime relay still depends on the OpenClaw plugin link."
        ),
        wechatImport: createCapability(
          "limited",
          "WeChat import only",
          "WeChat is available for historical transcript import, not as a realtime channel."
        )
      }
    };

    return NextResponse.json(response);
  } catch {
    const response: BackendHealth = {
      ok: false,
      service: "yaya-backend",
      models: {
        textModel: "MiniMax-M2.7",
        speechPath: "Gemini TTS",
        staticAvatarModel: "imagen-4.0-generate-001",
        ambienceModel: "Lyria 3 Clip"
      },
      openClawSecretConfigured: false,
      realtime: {
        backend: createCapability(
          "offline",
          "Backend unavailable",
          "Setup can still preview imported history, but generation needs the YaYa backend running."
        ),
        discordHistory: createCapability(
          "ready",
          "Discord history import ready",
          "Discord history parsing works in setup for transcript text and JSON arrays."
        ),
        discordBridge: createCapability(
          pluginAvailable ? "ready" : "limited",
          pluginAvailable ? "Bridge plugin available" : "Bridge plugin not found",
          pluginAvailable
            ? "The bridge plugin exists locally and can be attached when the runtime comes online."
            : "The OpenClaw bridge plugin is not present in this workspace."
        ),
        discordRelay: createCapability(
          "limited",
          "Realtime relay waiting on backend",
          "OpenClaw stays infrastructural, but the backend has to come online before Discord relay can answer."
        ),
        wechatImport: createCapability(
          "limited",
          "WeChat import only",
          "WeChat remains a historical import source only."
        )
      }
    };

    return NextResponse.json(response);
  }
}
