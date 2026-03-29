import { getConfig } from "./config.js";
import { ServiceError } from "./errors.js";

function getLocalAgentUrl() {
  return String(getConfig().localAgentUrl ?? "http://127.0.0.1:8791").replace(/\/$/, "");
}

async function callLocalAgent(path, body) {
  let response;

  try {
    response = await fetch(`${getLocalAgentUrl()}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body ?? {})
    });
  } catch (error) {
    throw new ServiceError("Failed to reach the local OpenClaw agent.", {
      status: 502,
      code: "openclaw_agent_unreachable",
      details: error instanceof Error ? error.message : String(error)
    });
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ServiceError("OpenClaw execution failed.", {
      status: 502,
      code: "openclaw_execution_failed",
      details: payload?.error?.message ?? payload ?? `Local agent returned ${response.status}.`
    });
  }

  return payload;
}

export function canDeliverToChannel(channelContext) {
  return Boolean(channelContext?.channel && channelContext?.targetId);
}

export async function sendOpenClawMessage(input) {
  if (!canDeliverToChannel(input)) {
    return null;
  }

  return callLocalAgent("/v1/openclaw/message/send", {
    channel: input.channel,
    target: input.targetId,
    message: input.message,
    replyTo: input.replyTo,
    accountId: input.accountId,
    silent: input.silent ?? false
  });
}
