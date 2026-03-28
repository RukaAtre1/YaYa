import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const DEFAULT_CHANNELS = ["discord"];

function normalizeBaseUrl(input) {
  return String(input ?? "http://localhost:8787").replace(/\/$/, "");
}

function buildHeaders(sharedSecret) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (sharedSecret) {
    headers["x-openclaw-secret"] = sharedSecret;
  }

  return headers;
}

export default definePluginEntry({
  id: "yaya-discord-bridge",
  name: "YaYa Discord Bridge",
  description: "Forward Discord messages from OpenClaw to the YaYa backend before dispatch.",
  register(api) {
    const pluginConfig = api.pluginConfig ?? {};
    const backendUrl = normalizeBaseUrl(
      pluginConfig.backendUrl ?? process.env.YAYA_BACKEND_URL ?? "http://localhost:8787"
    );
    const sharedSecret = String(
      pluginConfig.sharedSecret ?? process.env.OPENCLAW_SHARED_SECRET ?? ""
    ).trim();
    const enabledChannels = new Set(
      Array.isArray(pluginConfig.channels) && pluginConfig.channels.length > 0
        ? pluginConfig.channels.map((value) => String(value))
        : DEFAULT_CHANNELS
    );

    api.on(
      "before_dispatch",
      async (event, ctx) => {
        const channelId = ctx.channelId ?? event.channel ?? "";

        if (!enabledChannels.has(channelId)) {
          return;
        }

        const text = String(event.content ?? "").trim();

        if (!text) {
          return {
            handled: true,
            text: ""
          };
        }

        try {
          const response = await fetch(`${backendUrl}/v1/openclaw/message`, {
            method: "POST",
            headers: buildHeaders(sharedSecret),
            body: JSON.stringify({
              channel: channelId,
              userId: event.senderId ?? ctx.senderId ?? "unknown",
              text,
              history: [],
              metadata: {
                accountId: ctx.accountId,
                conversationId: ctx.conversationId,
                sessionKey: ctx.sessionKey,
                timestamp: event.timestamp,
                isGroup: event.isGroup ?? false
              }
            }),
            signal: AbortSignal.timeout(20000)
          });

          if (!response.ok) {
            const body = await response.text();
            api.logger.error?.(
              `yaya-discord-bridge: backend error ${response.status} for ${channelId}: ${body}`
            );

            return {
              handled: true,
              text: "YaYa backend is unavailable right now. Try again in a moment."
            };
          }

          const payload = await response.json();
          const replyText = payload?.reply?.message?.text;

          if (typeof replyText !== "string" || !replyText.trim()) {
            api.logger.warn?.("yaya-discord-bridge: backend response missing reply.message.text");
            return {
              handled: true,
              text: "YaYa did not produce a usable reply for that message."
            };
          }

          api.logger.info?.(`yaya-discord-bridge: handled ${channelId} message via YaYa backend`);

          return {
            handled: true,
            text: replyText
          };
        } catch (error) {
          api.logger.error?.(`yaya-discord-bridge: request failed: ${String(error)}`);

          return {
            handled: true,
            text: "YaYa backend request failed before a reply was ready."
          };
        }
      },
      { priority: 100 }
    );
  }
});
