import { sampleMessages } from "@/lib/demo-data";
import type {
  ImportNormalizationRequest,
  ImportNormalizationResult,
  ImportFormat,
  MessageRecord,
  SupportedSource
} from "@/types/yaya";

type TranscriptMatch = {
  speakerName: string;
  text: string;
  timestamp?: string;
};

type DiscordJsonMessage = {
  id?: string | number;
  author?:
    | string
    | {
        id?: string | number;
        name?: string;
        username?: string;
        displayName?: string;
        global_name?: string;
      };
  timestamp?: string;
  content?: string;
  text?: string;
  threadId?: string;
  channelId?: string;
};

type DiscordExporterJson = {
  channel?: {
    id?: string;
    name?: string;
  };
  messages?: Array<{
    id?: string | number;
    timestamp?: string;
    content?: string;
    author?: {
      id?: string | number;
      name?: string;
      nickname?: string;
    };
  }>;
};

function slugifySpeaker(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown-speaker";
}

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function normalizeTimestamp(rawTimestamp: string | undefined, fallbackBaseMs: number, index: number) {
  const candidate = rawTimestamp ? new Date(rawTimestamp) : null;

  if (candidate && !Number.isNaN(candidate.getTime())) {
    return candidate.toISOString();
  }

  return new Date(fallbackBaseMs + index * 60_000).toISOString();
}

function buildThreadId(source: SupportedSource, rawInput: string, explicitThreadId?: string) {
  if (explicitThreadId?.trim()) {
    return explicitThreadId.trim();
  }

  return `${source}-thread-${hashText(rawInput)}`;
}

function resolveDiscordAuthor(author: DiscordJsonMessage["author"]) {
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

function tryParseDiscordJson(rawInput: string) {
  const trimmed = rawInput.trim();

  if (!trimmed.startsWith("[")) {
    return null;
  }

  const payload = JSON.parse(trimmed) as unknown;

  if (!Array.isArray(payload)) {
    return null;
  }

  return payload as DiscordJsonMessage[];
}

function tryParseDiscordExporterJson(rawInput: string) {
  const trimmed = rawInput.trim();

  if (!trimmed.startsWith("{")) {
    return null;
  }

  const payload = JSON.parse(trimmed) as unknown;

  if (!payload || typeof payload !== "object" || !Array.isArray((payload as DiscordExporterJson).messages)) {
    return null;
  }

  return payload as DiscordExporterJson;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
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

function tryParseDiscordExporterCsv(rawInput: string) {
  const lines = rawInput
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

function parseTranscriptLine(line: string): TranscriptMatch | null {
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

function buildTranscript(rows: MessageRecord[]) {
  return rows.map((row) => `${row.speakerName}: ${row.text}`).join("\n");
}

function normalizeTranscriptInput(input: ImportNormalizationRequest, detectedFormat: ImportFormat) {
  const lines = input.rawInput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fallbackBaseMs = Date.now() - Math.max(lines.length - 1, 0) * 60_000;
  const threadId = buildThreadId(input.source, input.rawInput);
  const warnings: string[] = [];
  const rows: MessageRecord[] = [];
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

  if (rows.length === 0) {
    throw new Error("No usable messages were found in the imported history.");
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
  } satisfies ImportNormalizationResult;
}

function normalizeDiscordJsonInput(input: ImportNormalizationRequest, payload: DiscordJsonMessage[]) {
  const filtered = payload.filter((entry) => {
    const content = entry.content ?? entry.text;
    return typeof content === "string" && content.trim().length > 0;
  });

  if (filtered.length === 0) {
    throw new Error("The Discord JSON import did not contain any message content.");
  }

  const fallbackBaseMs = Date.now() - Math.max(filtered.length - 1, 0) * 60_000;
  const threadId = buildThreadId(
    input.source,
    input.rawInput,
    String(filtered[0]?.threadId ?? filtered[0]?.channelId ?? "")
  );

  const rows = filtered.map((entry, index) => {
    const author = resolveDiscordAuthor(entry.author);

    return {
      id: String(entry.id ?? `${threadId}-msg-${index + 1}`),
      threadId,
      speakerId: author.speakerId,
      speakerName: author.speakerName,
      timestamp: normalizeTimestamp(entry.timestamp, fallbackBaseMs, index),
      text: String(entry.content ?? entry.text ?? "").trim(),
      source: input.source
    } satisfies MessageRecord;
  });

  return {
    source: input.source,
    detectedFormat: "discord_json",
    threadId,
    transcript: buildTranscript(rows),
    rows,
    speakers: [...new Set(rows.map((row) => row.speakerName))],
    warnings: rows.some((row, index) => row.id === `${threadId}-msg-${index + 1}`)
      ? ["Some Discord messages were missing ids, so fallback ids were generated."]
      : []
  } satisfies ImportNormalizationResult;
}

function normalizeDiscordExporterJsonInput(input: ImportNormalizationRequest, payload: DiscordExporterJson) {
  const messages = (payload.messages ?? []).filter(
    (message) => typeof message.content === "string" && message.content.trim().length > 0
  );

  if (messages.length === 0) {
    throw new Error("The DiscordChatExporter JSON file did not contain any message content.");
  }

  const fallbackBaseMs = Date.now() - Math.max(messages.length - 1, 0) * 60_000;
  const threadId = buildThreadId(
    input.source,
    input.rawInput,
    String(payload.channel?.id ?? payload.channel?.name ?? "")
  );
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
    } satisfies MessageRecord;
  });

  return {
    source: input.source,
    detectedFormat: "discord_exporter_json",
    threadId,
    transcript: buildTranscript(rows),
    rows,
    speakers: [...new Set(rows.map((row) => row.speakerName))],
    warnings: []
  } satisfies ImportNormalizationResult;
}

function normalizeDiscordExporterCsvInput(
  input: ImportNormalizationRequest,
  payload: ReturnType<typeof tryParseDiscordExporterCsv>
) {
  if (!payload) {
    throw new Error("The Discord CSV import could not be parsed.");
  }

  const authorIndex = payload.header.indexOf("author");
  const contentIndex = payload.header.indexOf("content");
  const timestampIndex = payload.header.indexOf("timestamp");
  const idIndex = payload.header.indexOf("id");
  const rowsData = payload.rows.filter((row) => row[contentIndex]?.trim());

  if (rowsData.length === 0) {
    throw new Error("The DiscordChatExporter CSV file did not contain any message content.");
  }

  const fallbackBaseMs = Date.now() - Math.max(rowsData.length - 1, 0) * 60_000;
  const threadId = buildThreadId(input.source, input.rawInput, input.fileName);
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
    } satisfies MessageRecord;
  });

  return {
    source: input.source,
    detectedFormat: "discord_exporter_csv",
    threadId,
    transcript: buildTranscript(rows),
    rows,
    speakers: [...new Set(rows.map((row) => row.speakerName))],
    warnings: timestampIndex === -1 ? ["The CSV export did not include timestamps, so fallback ordering timestamps were generated."] : []
  } satisfies ImportNormalizationResult;
}

export function normalizeImportInput(input: ImportNormalizationRequest): ImportNormalizationResult {
  const rawInput = input.rawInput.trim();

  if (!rawInput) {
    throw new Error("Paste or upload some chat history first.");
  }

  if (input.source === "sample") {
    return {
      source: "sample",
      detectedFormat: "sample_transcript",
      threadId: sampleMessages[0]?.threadId ?? "sample-thread",
      transcript: buildTranscript(sampleMessages),
      rows: sampleMessages,
      speakers: [...new Set(sampleMessages.map((row) => row.speakerName))],
      warnings: []
    };
  }

  if (input.source === "discord") {
    try {
      const parsedExporterJson = tryParseDiscordExporterJson(rawInput);

      if (parsedExporterJson) {
        return normalizeDiscordExporterJsonInput(input, parsedExporterJson);
      }
    } catch (error) {
      return {
        ...normalizeTranscriptInput(input, "discord_transcript"),
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
        return normalizeDiscordJsonInput(input, parsedJson);
      }
    } catch (error) {
      return {
        ...normalizeTranscriptInput(input, "discord_transcript"),
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
        return normalizeDiscordExporterCsvInput(input, parsedCsv);
      }
    } catch (error) {
      return {
        ...normalizeTranscriptInput(input, "discord_transcript"),
        warnings: [
          `The Discord CSV payload could not be parsed cleanly, so YaYa treated it as a transcript. ${
            error instanceof Error ? error.message : String(error)
          }`
        ]
      };
    }

    return normalizeTranscriptInput(input, "discord_transcript");
  }

  return normalizeTranscriptInput(input, "wechat_transcript");
}

export function buildSourceTemplate(source: SupportedSource) {
  if (source === "wechat") {
    return [
      "Mom: Did you eat before class?",
      "Me: Not yet",
      "Mom: Don't start the day on coffee again."
    ].join("\n");
  }

  if (source === "discord") {
    return [
      "Aya: Did you eat before class?",
      "Me: Not yet",
      "Aya: Don't start the day on coffee again."
    ].join("\n");
  }

  return buildTranscript(sampleMessages);
}

export function buildImportPreviewLabel(result: ImportNormalizationResult | null) {
  if (!result) {
    return "Paste chat history to preview the imported relationship before generation.";
  }

  return `${result.rows.length} messages from ${result.speakers.length} speakers, ready for analysis.`;
}
