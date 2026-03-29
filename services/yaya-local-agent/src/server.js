import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const port = Number(process.env.YAYA_LOCAL_AGENT_PORT ?? 8791);
const host = process.env.YAYA_LOCAL_AGENT_HOST ?? "127.0.0.1";
const workspaceRoot = path.resolve(process.cwd(), "..", "..");

function json(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  response.end(JSON.stringify(body));
}

function ok(response, body) {
  json(response, 200, body);
}

function notFound(response) {
  json(response, 404, {
    error: {
      code: "not_found",
      message: "Route not found."
    }
  });
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function getDiscordToken(token) {
  return (
    token ||
    process.env.OPENCLAW_DISCORD_BOT_TOKEN ||
    process.env.DISCORD_BOT_TOKEN ||
    ""
  );
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? workspaceRoot,
      shell: options.shell ?? false,
      env: {
        ...process.env,
        ...(options.env ?? {})
      }
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `${command} failed with code ${code}`));
        return;
      }

      resolve({
        stdout,
        stderr
      });
    });
  });
}

function getOpenClawExecutable() {
  const appData = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appData, "npm", "openclaw.cmd");
}

function getDiscordExporterExecutable() {
  const home = os.homedir();
  const candidates = [
    process.env.DISCORD_CHAT_EXPORTER_PATH,
    path.join(
      home,
      "AppData",
      "Local",
      "Microsoft",
      "WinGet",
      "Packages",
      "Tyrrrz.DiscordChatExporter.CLI_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "DiscordChatExporter.Cli.exe"
    ),
    path.join(
      workspaceRoot,
      "tools",
      "DiscordChatExporter",
      "DiscordChatExporter.Cli.exe"
    )
  ].filter(Boolean);

  return candidates.find((candidate) => {
    try {
      return require("node:fs").existsSync(candidate);
    } catch {
      return false;
    }
  }) ?? null;
}

function runOpenClaw(args) {
  return runCommand("cmd.exe", ["/c", getOpenClawExecutable(), ...args], {
    cwd: workspaceRoot
  });
}

async function listFiles(targetPath, maxDepth, matcher, depth = 0, results = []) {
  if (depth > maxDepth) {
    return results;
  }

  let entries = [];
  try {
    entries = await fs.readdir(targetPath, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(targetPath, entry.name);
    const loweredPath = fullPath.toLowerCase();
    const loweredWorkspaceRoot = workspaceRoot.toLowerCase();
    const insideWorkspace = loweredPath.startsWith(loweredWorkspaceRoot);
    const insideAllowedWorkspaceExport =
      loweredPath.startsWith(path.join(workspaceRoot, "exports", "discord").toLowerCase()) ||
      loweredPath.startsWith(path.join(workspaceRoot, "exports", "wechat").toLowerCase());

    if (entry.isDirectory()) {
      if (insideWorkspace && !insideAllowedWorkspaceExport) {
        continue;
      }

      if (
        loweredPath.includes("\\.next") ||
        loweredPath.includes("\\node_modules") ||
        loweredPath.includes("\\openclaw-plugins") ||
        loweredPath.includes("\\.git") ||
        loweredPath.includes("\\dist") ||
        loweredPath.includes("\\build")
      ) {
        continue;
      }

      await listFiles(fullPath, maxDepth, matcher, depth + 1, results);
      continue;
    }

    if (insideWorkspace && !insideAllowedWorkspaceExport) {
      continue;
    }

    if (matcher(fullPath, entry.name)) {
      const stat = await fs.stat(fullPath).catch(() => null);
      results.push({
        path: fullPath,
        fileName: entry.name,
        sizeBytes: stat?.size ?? 0,
        modifiedAt: stat?.mtime?.toISOString?.() ?? null
      });
    }
  }

  return results;
}

function getDiscordSearchRoots() {
  const home = os.homedir();
  const downloads = path.join(home, "Downloads");
  return [
    path.join(workspaceRoot, "exports", "discord"),
    downloads,
    path.join(home, "Documents"),
    path.join(home, "Desktop")
  ];
}

function getWechatSearchRoots() {
  const home = os.homedir();
  const documents = path.join(home, "Documents");
  const appData = process.env.APPDATA ?? path.join(home, "AppData", "Roaming");
  const localAppData = process.env.LOCALAPPDATA ?? path.join(home, "AppData", "Local");

  return [
    path.join(workspaceRoot, "exports", "wechat"),
    documents,
    path.join(appData, "Tencent"),
    path.join(localAppData, "Tencent"),
    path.join(home, "Desktop")
  ];
}

async function scanDiscordExports() {
  const roots = getDiscordSearchRoots();
  const found = [];

  for (const root of roots) {
    if (!(await pathExists(root))) {
      continue;
    }

    await listFiles(
      root,
      3,
      (fullPath, fileName) => {
        const lowered = fileName.toLowerCase();
        const isJson = lowered.endsWith(".json");
        const isCsv = lowered.endsWith(".csv");
        const isTxt = lowered.endsWith(".txt");
        const looksLikeDiscordExport = isJson || isCsv || isTxt;
        const fullLower = fullPath.toLowerCase();
        const hasDiscordHint =
          fullLower.includes("\\exports\\discord") ||
          fullLower.includes("discordchatexporter") ||
          lowered.includes("discord") ||
          lowered.includes("messages") ||
          lowered.includes("export") ||
          lowered.includes("dm") ||
          lowered.includes("channel");
        const isPackageArtifact =
          lowered === "package.json" ||
          lowered.endsWith(".plugin.json") ||
          lowered === "export-marker.json";
        const isRepoArtifact =
          fullLower.includes("\\.next\\") ||
          fullLower.includes("\\node_modules\\") ||
          fullLower.includes("\\openclaw-plugins\\");
        const allowTxt = !isTxt || lowered.includes("discord") || fullLower.includes("discordchatexporter");
        return looksLikeDiscordExport && hasDiscordHint && allowTxt && !isPackageArtifact && !isRepoArtifact;
      },
      0,
      found
    );
  }

  return found.sort((left, right) => String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
}

async function scanWechatDatabases() {
  const roots = getWechatSearchRoots();
  const found = [];

  for (const root of roots) {
    if (!(await pathExists(root))) {
      continue;
    }

    await listFiles(
      root,
      4,
      (fullPath, fileName) => {
        const lowered = fileName.toLowerCase();
        const looksLikeDb =
          lowered.endsWith(".db") || lowered.endsWith(".sqlite") || lowered.endsWith(".sqlite3");
        const hasWechatHint =
          fullPath.toLowerCase().includes("wechat") ||
          fullPath.toLowerCase().includes("mm.sqlite") ||
          fullPath.toLowerCase().includes("wechathistory");
        return looksLikeDb && hasWechatHint;
      },
      0,
      found
    );
  }

  return found.sort((left, right) => String(right.modifiedAt).localeCompare(String(left.modifiedAt)));
}

function runDiscordExporter({ exporterPath, token, channelId, format = "Json", outputPath }) {
  return new Promise((resolve, reject) => {
    const resolvedExporterPath = exporterPath || getDiscordExporterExecutable();
    const resolvedToken = getDiscordToken(token);
    const resolvedOutputPath =
      outputPath || path.join(workspaceRoot, "exports", "discord", `discord-${channelId}.${format.toLowerCase()}`);

    if (!resolvedExporterPath || !resolvedToken || !channelId) {
      reject(new Error("DiscordChatExporter, token, and channelId are required."));
      return;
    }

    const child = spawn(
      resolvedExporterPath,
      ["export", "-t", resolvedToken, "-c", channelId, "-f", format, "-o", resolvedOutputPath],
      { cwd: workspaceRoot }
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || "DiscordChatExporter failed."));
        return;
      }

      resolve({
        exporterPath: resolvedExporterPath,
        outputPath: resolvedOutputPath,
        stdout,
        stderr
      });
    });
  });
}

async function runDiscordExporterListCommand(command, args = [], token = "") {
  const resolvedExporterPath = getDiscordExporterExecutable();
  const resolvedToken = getDiscordToken(token);

  if (!resolvedExporterPath || !resolvedToken) {
    throw new Error("DiscordChatExporter and a Discord token are required.");
  }

  const result = await runCommand(resolvedExporterPath, [command, "-t", resolvedToken, ...args], {
    cwd: workspaceRoot
  });

  return result.stdout || "";
}

function parseDiscordExporterRows(output) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("|"))
    .map((line) => line.split("|").map((part) => part.trim()))
    .filter((parts) => /^\d{5,}$/.test(parts[0] ?? ""));
}

async function listDiscordTargets(token = "") {
  const dmOutput = await runDiscordExporterListCommand("dm", [], token).catch(() => "");
  const guildOutput = await runDiscordExporterListCommand("guilds", [], token).catch(() => "");

  const dmTargets = parseDiscordExporterRows(dmOutput).map((parts) => ({
    id: parts[0],
    kind: "dm",
    name: parts.slice(1).join(" | ") || parts[0],
    label: parts.slice(1).join(" | ") || parts[0]
  }));

  const guilds = parseDiscordExporterRows(guildOutput).map((parts) => ({
    id: parts[0],
    name: parts.slice(1).join(" | ") || parts[0]
  }));

  const guildTargets = [];

  for (const guild of guilds) {
    const channelOutput = await runDiscordExporterListCommand(
      "channels",
      ["-g", guild.id, "--include-threads", "All"],
      token
    ).catch(() => "");

    for (const parts of parseDiscordExporterRows(channelOutput)) {
      const name = parts.slice(1).join(" | ") || parts[0];
      guildTargets.push({
        id: parts[0],
        kind: "guild_channel",
        name,
        label: `${guild.name} / ${name}`,
        guildId: guild.id,
        guildName: guild.name
      });
    }
  }

  return {
    targets: [...dmTargets, ...guildTargets]
  };
}

async function getOpenClawStatus() {
  const channels = await runOpenClaw(["--dev", "channels", "status"]);
  const plugins = await runOpenClaw(["--dev", "plugins", "list"]);

  const channelsOutput = channels.stdout || channels.stderr || "";
  const pluginsOutput = plugins.stdout || plugins.stderr || "";
  const discordLine = channelsOutput
    .split(/\r?\n/)
    .find((line) => line.trim().toLowerCase().startsWith("- discord"));

  return {
    gatewayReachable: /gateway reachable/i.test(channelsOutput),
    bridgeLoaded: /yaya-\s*discord/i.test(pluginsOutput) && /loaded/i.test(pluginsOutput),
    discordConfigured: discordLine ? !/not configured/i.test(discordLine) : false,
    discordConnected: discordLine ? !/disconnected/i.test(discordLine) : false,
    channelStatusLine: discordLine?.trim() ?? "Discord status unavailable",
    rawChannelsStatus: channelsOutput.trim(),
    rawPluginsStatus: pluginsOutput.trim()
  };
}

async function ensureOpenClawBridgeInstalled() {
  const bridgePath = path.join(workspaceRoot, "openclaw-plugins", "yaya-discord-bridge");
  await runOpenClaw(["--dev", "plugins", "install", "--link", bridgePath]).catch(() => null);
}

async function connectOpenClawDiscord({ token, name = "yaya-discord" }) {
  const resolvedToken = getDiscordToken(token);

  await runOpenClaw(["--profile", "dev", "config", "set", "gateway.mode", "local"]);
  await ensureOpenClawBridgeInstalled();

  if (!resolvedToken) {
    throw new Error("Discord bot token is required before realtime can connect.");
  }

  await runOpenClaw([
    "--dev",
    "channels",
    "add",
    "--channel",
    "discord",
    "--token",
    resolvedToken,
    "--name",
    name
  ]);

  return getOpenClawStatus();
}

async function startOpenClawGateway() {
  const child = spawn(
    "cmd.exe",
    ["/c", "start", "", getOpenClawExecutable(), "--dev", "gateway"],
    {
      cwd: workspaceRoot,
      detached: true,
      stdio: "ignore"
    }
  );

  child.unref();
  return { started: true };
}

async function sendOpenClawMessage({
  channel = "discord",
  target,
  message,
  replyTo,
  accountId,
  silent = false,
  dryRun = false
}) {
  if (!target || !message) {
    throw new Error("channel target and message are required.");
  }

  const args = ["--dev", "message", "send", "--channel", channel, "--target", target, "--message", message, "--json"];

  if (replyTo) {
    args.push("--reply-to", replyTo);
  }

  if (accountId) {
    args.push("--account", accountId);
  }

  if (silent) {
    args.push("--silent");
  }

  if (dryRun) {
    args.push("--dry-run");
  }

  const result = await runOpenClaw(args);
  const stdout = (result.stdout || "").trim();

  try {
    return JSON.parse(stdout);
  } catch {
    return {
      ok: true,
      channel,
      target,
      stdout,
      stderr: result.stderr || ""
    };
  }
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    notFound(response);
    return;
  }

  const url = new URL(request.url, `http://${host}:${port}`);

  if (request.method === "OPTIONS") {
    json(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/health") {
    ok(response, {
      ok: true,
      service: "yaya-local-agent",
      capabilities: {
        discordExportScan: true,
        wechatDbScan: true,
        discordExporterCli: true,
        privilegedFilesystemAccess: true
      }
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/v1/scan/discord-exports") {
    ok(response, {
      source: "discord",
      files: await scanDiscordExports()
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/v1/scan/wechat-dbs") {
    ok(response, {
      source: "wechat",
      files: await scanWechatDatabases()
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/v1/discord/targets") {
    try {
      ok(response, await listDiscordTargets(url.searchParams.get("token") ?? ""));
    } catch (error) {
      json(response, 400, {
        error: {
          code: "discord_targets_failed",
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/discord/export") {
    try {
      const body = await readJsonBody(request);
      ok(response, await runDiscordExporter(body));
    } catch (error) {
      json(response, 400, {
        error: {
          code: "discord_export_failed",
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
    return;
  }

  if (request.method === "GET" && url.pathname === "/v1/openclaw/discord/status") {
    try {
      ok(response, await getOpenClawStatus());
    } catch (error) {
      json(response, 400, {
        error: {
          code: "openclaw_status_failed",
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/openclaw/discord/connect") {
    try {
      const body = await readJsonBody(request);
      ok(response, await connectOpenClawDiscord(body));
    } catch (error) {
      json(response, 400, {
        error: {
          code: "openclaw_connect_failed",
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/openclaw/gateway/start") {
    try {
      ok(response, await startOpenClawGateway());
    } catch (error) {
      json(response, 400, {
        error: {
          code: "openclaw_gateway_start_failed",
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/openclaw/message/send") {
    try {
      const body = await readJsonBody(request);
      ok(response, await sendOpenClawMessage(body));
    } catch (error) {
      json(response, 400, {
        error: {
          code: "openclaw_message_send_failed",
          message: error instanceof Error ? error.message : String(error)
        }
      });
    }
    return;
  }

  notFound(response);
});

server.listen(port, host, () => {
  console.log(`YaYa local agent listening on http://${host}:${port}`);
});
