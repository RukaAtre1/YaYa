import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { toApiErrorResponse } from "@/lib/yaya-backend";
import type { ImportNormalizationResult } from "@/types/yaya";

const workspaceRoot = process.cwd();
const mockHistoryPath = path.join(workspaceRoot, "YaYa_chathistory_mock.md");
const generatedTranscriptPath = path.join(workspaceRoot, "exports", "mock", "yaya-mock-transcript.txt");

function buildMockTranscript(rawText: string) {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const transcriptLines = lines.map((line, index) => {
    const speaker = index % 2 === 0 ? "Harley" : "YaYa";
    return `${speaker}: ${line}`;
  });

  return transcriptLines.join("\n");
}

function slugifySpeaker(name: string) {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "unknown-speaker";
}

function buildNormalizationFromTranscript(transcript: string): ImportNormalizationResult {
  const lines = transcript
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const threadId = "sample-thread-yaya-mock";
  const fallbackBaseMs = Date.now() - Math.max(lines.length - 1, 0) * 60_000;

  const rows = lines.map((line, index) => {
    const separatorIndex = line.indexOf(":");
    const speakerName = separatorIndex >= 0 ? line.slice(0, separatorIndex).trim() : "Unknown speaker";
    const text = separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : line;

    return {
      id: `${threadId}-msg-${index + 1}`,
      threadId,
      speakerId: slugifySpeaker(speakerName),
      speakerName,
      timestamp: new Date(fallbackBaseMs + index * 60_000).toISOString(),
      text,
      source: "sample" as const
    };
  });

  return {
    source: "sample",
    detectedFormat: "sample_transcript",
    threadId,
    transcript,
    rows,
    speakers: [...new Set(rows.map((row) => row.speakerName))],
    warnings: []
  };
}

export async function GET() {
  try {
    const rawText = await fs.readFile(mockHistoryPath, "utf8");
    const transcript = buildMockTranscript(rawText);

    await fs.mkdir(path.dirname(generatedTranscriptPath), { recursive: true });
    await fs.writeFile(generatedTranscriptPath, transcript, "utf8");

    const normalized = buildNormalizationFromTranscript(transcript);

    return NextResponse.json({
      ...(normalized as ImportNormalizationResult),
      warnings: [
        "This mock import was reconstructed by alternating lines between Harley and YaYa.",
        ...(normalized.warnings ?? [])
      ],
      mockSourcePath: mockHistoryPath,
      generatedTranscriptPath
    });
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
