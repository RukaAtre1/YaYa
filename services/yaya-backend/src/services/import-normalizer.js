import { sampleMessages } from "../sample-data.js";
import { ServiceError } from "./errors.js";

function slugifySpeaker(name) {
  const normalized = String(name ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown-speaker";
}

function hashText(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function normalizeTimestamp(rawTimestamp, fallbackBaseMs, index) {
  const candidate = rawTimestamp ? new Date(rawTimestamp) : null;

  if (candidate && !Number.isNaN(candidate.getTime())) {
    return candidate.toISOString();
  }

  return new Date(fallbackBaseMs + index * 60_000).toISOString();
}

function buildThreadId(source, rawInput, explicitThreadId = "") {
  if (String(explicitThreadId).trim()) {
    return String(explicitThreadId).trim();
  }

  return `${source}-thread-${hashText(rawInput)}`;
}

function parseTranscriptLine(line) {
  const bracketTimestampMatch = line.match(/^\[([^\]]+)\]\s*([^:：]+)\s*[:：]\s*(.+)$/);

  if (bracketTimestampMatch) {
    return {
      timestamp: bracketTimestampMatch[1]?.trim(),
      speakerName: bracketTimestampMatch[2]?.trim(),
      text: bracketTimestampMatch[3]?.trim()
    };
  }

  const inlineTimestampMatch = line.match(
    /^(\d{4}[-/]\d{1,2}[-/]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?(?: ?(?:AM|PM))?)?)\s+([^:：]+)\s*[:：]\s*(.+)$/i
  );

  if (inlineTimestampMatch) {
    return {
      timestamp: inlineTimestampMatch[1]?.trim(),
      speakerName: inlineTimestampMatch[2]?.trim(),
      text: inlineTimestampMatch[3]?.trim()
    };
  }

  const speakerMatch = line.match(/^([^:：]{1,40})\s*[:：]\s*(.+)$/);

  if (speakerMatch) {
    return {
      speakerName: speakerMatch[1]?.trim(),
      text: speakerMatch[2]?.trim()
    };
  }

  return null;
}

function buildTranscript(rows) {
  return rows.map((row) => `${row.speakerName}: ${row.text}`).join("\n");
}

function resolveDiscordAuthor(author) {
  if (typeof author === "string" && author.trim()) {
    return {
      speakerName: author.trim(),
      speakerId: slugifySpeaker(author)
    };
  }

  if (author && typeof author === "object") {
    const speakerName =
      author.displayName ??
      author.global_name ??
      author.name ??
      author.username ??
      "Unknown speaker";

    return {
      speakerName,
      speakerId: String(author.id ?? slugifySpeaker(speakerName))
    };
  }

  return {
    speakerName: "Unknown speaker",
    speakerId: "unknown-speaker"
  };
}

function tryParseDiscordJson(rawInput) {
  const trimmed = rawInput.trim();

  if (!trimmed.startsWith("[")) {
    return null;
  }

  const payload = JSON.parse(trimmed);

  return Array.isArray(payload) ? payload : null;
}

function tryParseDiscordExporterJson(rawInput) {
  const trimmed = rawInput.trim();

  if (!trimmed.startsWith("{")) {
    return null;
  }

  const payload = JSON.parse(trimmed);

  return Array.isArray(payload?.messages) ? payload : null;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function tryParseDiscordExporterCsv(rawInput) {
  const lines = String(rawInput ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const header = parseCsvLine(lines[0]).map((value) => value.toLowerCase());

  if (!header.includes("author") || !header.includes("content")) {
    return null;
  }

  return {
    header,
    rows: lines.slice(1).map((line) => parseCsvLine(line))
  };
}

function normalizeTranscriptInput(input, detectedFormat) {
  const lines = String(input.rawInput ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new ServiceError("No usable messages were found in the imported history.", {
      status: 400,
      code: "import_empty"
    });
  }

  const threadId = buildThreadId(input.source, input.rawInput);
  const fallbackBaseMs = Date.now() - Math.max(lines.length - 1, 0) * 60_000;
  const warnings = [];
  const rows = [];
  let sawExplicitTimestamp = false;

  for (const line of lines) {
    const parsed = parseTranscriptLine(line);

    if (parsed) {
      if (parsed.timestamp) {
        sawExplicitTimestamp = true;
      }

      rows.push({
        id: `${threadId}-msg-${rows.length + 1}`,
        threadId,
        speakerId: slugifySpeaker(parsed.speakerName),
        speakerName: parsed.speakerName,
        timestamp: normalizeTimestamp(parsed.timestamp, fallbackBaseMs, rows.length),
        text: parsed.text,
        source: input.source
      });
      continue;
    }

    if (rows.length > 0) {
      rows[rows.length - 1] = {
        ...rows[rows.length - 1],
        text: `${rows[rows.length - 1].text}\n${line}`
      };
      continue;
    }

    warnings.push("Some lines did not include speaker names, so they were assigned to Unknown speaker.");
    rows.push({
      id: `${threadId}-msg-${rows.length + 1}`,
      threadId,
      speakerId: "unknown-speaker",
      speakerName: "Unknown speaker",
      timestamp: normalizeTimestamp(undefined, fallbackBaseMs, rows.length),
      text: line,
      source: input.source
    });
  }

  if (!sawExplicitTimestamp) {
    warnings.push("No timestamps were found, so YaYa generated approximate ordering timestamps.");
  }

  return {
    source: input.source,
    detectedFormat,
    threadId,
    transcript: buildTranscript(rows),
    rows,
    speakers: [...new Set(rows.map((row) => row.speakerName))],
    warnings
  };
}

function normalizeDiscordJsonInput(input, payload) {
  const filtered = payload.filter((entry) => {
    const content = entry?.content ?? entry?.text;
    return typeof content === "string" && content.trim().length > 0;
  });

  if (filtered.length === 0) {
    throw new ServiceError("The Discord JSON import did not contain any message content.", {
      status: 400,
      code: "discord_json_empty"
    });
  }

  const threadId = buildThreadId(
    input.source,
    input.rawInput,
    filtered[0]?.threadId ?? filtered[0]?.channelId ?? ""
  );
  const fallbackBaseMs = Date.now() - Math.max(filtered.length - 1, 0) * 60_000;
  const warnings = [];

  const rows = filtered.map((entry, index) => {
    const author = resolveDiscordAuthor(entry.author);
    const generatedId = `${threadId}-msg-${index + 1}`;

    if (entry.id === undefined || entry.id === null) {
      warnings.push("Some Discord messages were missing ids, so fallback ids were generated.");
    }

    return {
      id: String(entry.id ?? generatedId),
      threadId,
      speakerId: author.speakerId,
      speakerName: author.speakerName,
      timestamp: normalizeTimestamp(entry.timestamp, fallbackBaseMs, index),
      text: String(entry.content ?? entry.text ?? "").trim(),
      source: input.source
    };
  });

  return {
    source: input.source,
    detectedFormat: "discord_json",
    threadId,
    transcript: buildTranscript(rows),
    rows,
    speakers: [...new Set(rows.map((row) => row.speakerName))],
    warnings: [...new Set(warnings)]
  };
}

function normalizeDiscordExporterJsonInput(input, payload) {
  const messages = (payload.messages ?? []).filter(
    (message) => typeof message?.content === "string" && message.content.trim().length > 0
  );

  if (messages.length === 0) {
    throw new ServiceError("The DiscordChatExporter JSON file did not contain any message content.", {
      status: 400,
      code: "discord_exporter_json_empty"
    });
  }

  const threadId = buildThreadId(
    input.source,
    input.rawInput,
    payload.channel?.id ?? payload.channel?.name ?? ""
  );
  const fallbackBaseMs = Date.now() - Math.max(messages.length - 1, 0) * 60_000;
  const rows = messages.map((message, index) => {
    const speakerName = message.author?.nickname ?? message.author?.name ?? "Unknown speaker";

    return {
      id: String(message.id ?? `${threadId}-msg-${index + 1}`),
      threadId,
      speakerId: String(message.author?.id ?? slugifySpeaker(speakerName)),
      speakerName,
      timestamp: normalizeTimestamp(message.timestamp, fallbackBaseMs, index),
      text: String(message.content ?? "").trim(),
      source: input.source
    };
  });

  return {
    source: input.source,
    detectedFormat: "discord_exporter_json",
    threadId,
    transcript: buildTranscript(rows),
    rows,
    speakers: [...new Set(rows.map((row) => row.speakerName))],
    warnings: []
  };
}

function normalizeDiscordExporterCsvInput(input, payload) {
  const authorIndex = payload.header.indexOf("author");
  const contentIndex = payload.header.indexOf("content");
  const timestampIndex = payload.header.indexOf("timestamp");
  const idIndex = payload.header.indexOf("id");
  const rowsData = payload.rows.filter((row) => row[contentIndex]?.trim());

  if (rowsData.length === 0) {
    throw new ServiceError("The DiscordChatExporter CSV file did not contain any message content.", {
      status: 400,
      code: "discord_exporter_csv_empty"
    });
  }

  const threadId = buildThreadId(input.source, input.rawInput, input.fileName ?? "");
  const fallbackBaseMs = Date.now() - Math.max(rowsData.length - 1, 0) * 60_000;
  const rows = rowsData.map((row, index) => {
    const speakerName = row[authorIndex] || "Unknown speaker";

    return {
      id: row[idIndex] || `${threadId}-msg-${index + 1}`,
      threadId,
      speakerId: slugifySpeaker(speakerName),
      speakerName,
      timestamp: normalizeTimestamp(row[timestampIndex], fallbackBaseMs, index),
      text: row[contentIndex],
      source: input.source
    };
  });

  return {
    source: input.source,
    detectedFormat: "discord_exporter_csv",
    threadId,
    transcript: buildTranscript(rows),
    rows,
    speakers: [...new Set(rows.map((row) => row.speakerName))],
    warnings:
      timestampIndex === -1
        ? ["The CSV export did not include timestamps, so fallback ordering timestamps were generated."]
        : []
  };
}

export function getImportCapabilities() {
  return {
    sources: ["discord", "wechat"],
    acceptedFormats: [
      "discord_json",
      "discord_exporter_json",
      "discord_exporter_csv",
      "discord_transcript",
      "wechat_transcript",
      "wechat_history_sqlite"
    ],
    rows: sampleMessages
  };
}

export function normalizeImportPayload(input = {}) {
  const source = String(input.source ?? "").trim() || "discord";
  const rawInput = String(input.rawInput ?? "").trim();

  if (!rawInput) {
    throw new ServiceError("Paste or upload some chat history first.", {
      status: 400,
      code: "import_input_missing"
    });
  }

  if (source === "discord") {
    try {
      const parsedExporterJson = tryParseDiscordExporterJson(rawInput);

      if (parsedExporterJson) {
        return normalizeDiscordExporterJsonInput({ ...input, source, rawInput }, parsedExporterJson);
      }
    } catch (error) {
      const transcriptResult = normalizeTranscriptInput(
        { ...input, source, rawInput },
        "discord_transcript"
      );

      return {
        ...transcriptResult,
        warnings: [
          `The DiscordChatExporter JSON payload could not be parsed cleanly, so YaYa treated it as a transcript. ${
            error instanceof Error ? error.message : String(error)
          }`
        ]
      };
    }

    try {
      const parsedJson = tryParseDiscordJson(rawInput);

      if (parsedJson) {
        return normalizeDiscordJsonInput({ ...input, source, rawInput }, parsedJson);
      }
    } catch (error) {
      const transcriptResult = normalizeTranscriptInput(
        { ...input, source, rawInput },
        "discord_transcript"
      );

      return {
        ...transcriptResult,
        warnings: [
          `The JSON payload could not be parsed cleanly, so YaYa treated it as a Discord transcript. ${
            error instanceof Error ? error.message : String(error)
          }`
        ]
      };
    }

    try {
      const parsedCsv = tryParseDiscordExporterCsv(rawInput);

      if (parsedCsv) {
        return normalizeDiscordExporterCsvInput({ ...input, source, rawInput }, parsedCsv);
      }
    } catch (error) {
      const transcriptResult = normalizeTranscriptInput(
        { ...input, source, rawInput },
        "discord_transcript"
      );

      return {
        ...transcriptResult,
        warnings: [
          `The Discord CSV payload could not be parsed cleanly, so YaYa treated it as a transcript. ${
            error instanceof Error ? error.message : String(error)
          }`
        ]
      };
    }

    return normalizeTranscriptInput({ ...input, source, rawInput }, "discord_transcript");
  }

  if (source === "wechat") {
    return normalizeTranscriptInput({ ...input, source, rawInput }, "wechat_transcript");
  }

  throw new ServiceError("Unsupported import source.", {
    status: 400,
    code: "import_source_unsupported",
    details: source
  });
}
