"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ApiErrorPayload,
  BackendHealth,
  GeneratedVirtualHumanSession,
  ImportNormalizationResult,
  LocalAgentFileRecord,
  LocalAgentScanResult,
  MessageRecord,
  OpenClawDiscordStatus,
  RelationalProfile
} from "@/types/yaya";

const SESSION_STORAGE_KEY = "yaya-generated-session";

type SetupState = "idle" | "analyzing" | "generating" | "entering";
type HistoryWindow = "100" | "300" | "1000" | "all";
type DiscordSpeakerOption = {
  speakerId: string;
  speakerName: string;
};
type DiscordConversationSummary = {
  filePath: string;
  fileName: string;
  label: string;
  messageCount: number;
  speakersLine: string;
  targetOptions: DiscordSpeakerOption[];
  normalized: ImportNormalizationResult;
};

function buildTranscript(rows: MessageRecord[]) {
  return rows.map((row) => `${row.speakerName}: ${row.text}`).join("\n");
}

function buildSpeakerOptions(result: ImportNormalizationResult) {
  const seen = new Set<string>();
  const options: DiscordSpeakerOption[] = [];

  for (const row of result.rows) {
    const normalizedName = row.speakerName.trim().toLowerCase();
    if (normalizedName === "unknown speaker" || normalizedName === "me" || row.speakerId === "me") {
      continue;
    }

    const key = `${row.speakerId}:${row.speakerName}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    options.push({
      speakerId: row.speakerId,
      speakerName: row.speakerName
    });
  }

  return options;
}

function buildConversationLabel(file: LocalAgentFileRecord, result: ImportNormalizationResult) {
  const names = buildSpeakerOptions(result).map((speaker) => speaker.speakerName);

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  if (names.length > 2) {
    return `${names[0]} + ${names.length - 1} more`;
  }

  return file.fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || file.fileName;
}

function summarizeImport(rows: MessageRecord[], targetName: string) {
  if (rows.length === 0) {
    return "Import one Discord conversation and choose who YaYa should keep talking to.";
  }

  const targetPart = targetName ? ` · live target ${targetName}` : "";
  return `${rows.length} messages selected${targetPart}.`;
}

function formatRealtimeState(status: OpenClawDiscordStatus | null) {
  if (!status) {
    return "checking realtime status";
  }

  if (status.discordConnected) {
    return "realtime connected";
  }

  if (status.discordConfigured) {
    return "discord configured";
  }

  if (status.gatewayReachable) {
    return "gateway ready";
  }

  return "realtime not configured";
}

function isNumericDiscordId(value: string) {
  return /^\d{5,}$/.test(value);
}

export function SetupFlow() {
  const router = useRouter();
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [openClawStatus, setOpenClawStatus] = useState<OpenClawDiscordStatus | null>(null);
  const [conversations, setConversations] = useState<DiscordConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState("");
  const [selectedSpeakerId, setSelectedSpeakerId] = useState("");
  const [historyWindow, setHistoryWindow] = useState<HistoryWindow>("300");
  const [discordBotToken, setDiscordBotToken] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [realtimeError, setRealtimeError] = useState("");
  const [setupError, setSetupError] = useState("");
  const [isImportingHistory, setIsImportingHistory] = useState(false);
  const [isConnectingRealtime, setIsConnectingRealtime] = useState(false);
  const [setupState, setSetupState] = useState<SetupState>("idle");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/health")
      .then(async (response) => (await response.json()) as BackendHealth)
      .then((payload) => {
        if (!cancelled) {
          setHealth(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHealth(null);
        }
      });

    void fetch("/api/openclaw/discord")
      .then(async (response) => {
        const payload = (await response.json()) as OpenClawDiscordStatus | ApiErrorPayload;
        if (!response.ok) {
          throw new Error((payload as ApiErrorPayload).error.message);
        }

        return payload as OpenClawDiscordStatus;
      })
      .then((payload) => {
        if (!cancelled) {
          setOpenClawStatus(payload);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setOpenClawStatus(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const runtimeSummary = useMemo(() => {
    if (!health) {
      return "runtime unavailable";
    }

    return `${health.ok ? "backend ready" : "backend offline"} · ${formatRealtimeState(openClawStatus)}`;
  }, [health, openClawStatus]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.filePath === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const selectedTarget = useMemo(
    () => selectedConversation?.targetOptions.find((option) => option.speakerId === selectedSpeakerId) ?? null,
    [selectedConversation, selectedSpeakerId]
  );

  const workingRows = useMemo(() => {
    if (!selectedConversation) {
      return [];
    }

    if (historyWindow === "all") {
      return selectedConversation.normalized.rows;
    }

    return selectedConversation.normalized.rows.slice(-Number(historyWindow));
  }, [historyWindow, selectedConversation]);

  const workingTranscript = useMemo(() => buildTranscript(workingRows), [workingRows]);
  const importSummary = useMemo(
    () => summarizeImport(workingRows, selectedTarget?.speakerName ?? ""),
    [selectedTarget?.speakerName, workingRows]
  );
  const realtimeTargetReady = useMemo(
    () => Boolean(selectedTarget && isNumericDiscordId(selectedTarget.speakerId)),
    [selectedTarget]
  );

  const handleImportDiscordHistory = async () => {
    setIsImportingHistory(true);
    setHistoryError("");
    setSetupError("");

    try {
      const scanResponse = await fetch("/api/agent/scan/discord");
      const scanPayload = (await scanResponse.json()) as LocalAgentScanResult | ApiErrorPayload;

      if (!scanResponse.ok) {
        throw new Error((scanPayload as ApiErrorPayload).error.message);
      }

      const files = (scanPayload as LocalAgentScanResult).files;

      if (files.length === 0) {
        setConversations([]);
        setSelectedConversationId("");
        setSelectedSpeakerId("");
        setHistoryError("No local Discord exports were found yet.");
        return;
      }

      const results = await Promise.allSettled(
        files.map(async (file) => {
          const response = await fetch("/api/import", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              source: "discord",
              filePath: file.path
            })
          });
          const payload = (await response.json()) as ImportNormalizationResult | ApiErrorPayload;

          if (!response.ok) {
            throw new Error((payload as ApiErrorPayload).error.message);
          }

          const normalized = payload as ImportNormalizationResult;
          const targetOptions = buildSpeakerOptions(normalized);

          return {
            filePath: file.path,
            fileName: file.fileName,
            label: buildConversationLabel(file, normalized),
            messageCount: normalized.rows.length,
            speakersLine: targetOptions.map((option) => option.speakerName).join(", "),
            targetOptions,
            normalized
          } satisfies DiscordConversationSummary;
        })
      );

      const nextConversations = results
        .filter((result): result is PromiseFulfilledResult<DiscordConversationSummary> => result.status === "fulfilled")
        .map((result) => result.value)
        .filter((conversation) => conversation.targetOptions.length > 0)
        .sort((left, right) => right.messageCount - left.messageCount);

      if (nextConversations.length === 0) {
        setConversations([]);
        setSelectedConversationId("");
        setSelectedSpeakerId("");
        setHistoryError("Discord exports were found, but none exposed a targetable conversation.");
        return;
      }

      const firstConversation = nextConversations[0];
      setConversations(nextConversations);
      setSelectedConversationId(firstConversation.filePath);
      setSelectedSpeakerId(firstConversation.targetOptions[0]?.speakerId ?? "");
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Failed to import Discord history.");
    } finally {
      setIsImportingHistory(false);
    }
  };

  const handleConnectRealtime = async () => {
    if (!selectedTarget) {
      setRealtimeError("Choose who YaYa should keep talking to before connecting realtime.");
      return;
    }

    setIsConnectingRealtime(true);
    setRealtimeError("");

    try {
      const response = await fetch("/api/openclaw/discord", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          token: discordBotToken.trim() || undefined
        })
      });
      const payload = (await response.json()) as OpenClawDiscordStatus | ApiErrorPayload;

      if (!response.ok) {
        throw new Error((payload as ApiErrorPayload).error.message);
      }

      let nextStatus = payload as OpenClawDiscordStatus;

      if (!nextStatus.gatewayReachable) {
        await fetch("/api/openclaw/gateway", {
          method: "POST"
        });

        const refreshResponse = await fetch("/api/openclaw/discord");
        const refreshPayload = (await refreshResponse.json()) as OpenClawDiscordStatus | ApiErrorPayload;

        if (refreshResponse.ok) {
          nextStatus = refreshPayload as OpenClawDiscordStatus;
        }
      }

      setOpenClawStatus(nextStatus);
    } catch (error) {
      setRealtimeError(error instanceof Error ? error.message : "Failed to connect Discord realtime.");
    } finally {
      setIsConnectingRealtime(false);
    }
  };

  const handleGenerateAndEnter = () => {
    if (!selectedConversation || workingRows.length === 0) {
      setSetupError("Import one Discord conversation before generating.");
      return;
    }

    if (!selectedTarget) {
      setSetupError("Choose who YaYa should keep talking to.");
      return;
    }

    setSetupError("");

    startTransition(async () => {
      try {
        setSetupState("analyzing");

        const filteredImport: ImportNormalizationResult = {
          ...selectedConversation.normalized,
          transcript: workingTranscript,
          rows: workingRows,
          speakers: [...new Set(workingRows.map((row) => row.speakerName))]
        };

        const analysisResponse = await fetch("/api/analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ transcript: filteredImport.transcript })
        });

        const analysisPayload = (await analysisResponse.json()) as RelationalProfile | ApiErrorPayload;

        if (!analysisResponse.ok) {
          throw new Error((analysisPayload as ApiErrorPayload).error.message);
        }

        const profile = analysisPayload as RelationalProfile;
        setSetupState("generating");

        const [personaResponse, avatarResponse] = await Promise.all([
          fetch("/api/persona", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ profile })
          }),
          fetch("/api/avatar", {
            method: "GET"
          })
        ]);

        const [personaPayload, avatarPayload] = await Promise.all([personaResponse.json(), avatarResponse.json()]);

        if (!personaResponse.ok) {
          throw new Error((personaPayload as ApiErrorPayload).error.message);
        }

        if (!avatarResponse.ok) {
          throw new Error((avatarPayload as ApiErrorPayload).error.message);
        }

        const bundle: GeneratedVirtualHumanSession = {
          sourceText: filteredImport.transcript,
          source: filteredImport.source,
          importFormat: filteredImport.detectedFormat,
          threadId: filteredImport.threadId,
          normalizedMessages: filteredImport.rows,
          speakers: filteredImport.speakers,
          discordTarget: {
            speakerId: selectedTarget.speakerId,
            speakerName: selectedTarget.speakerName,
            threadId: filteredImport.threadId
          },
          profile,
          persona: personaPayload,
          avatar: avatarPayload.avatar,
          avatarModel: avatarPayload.model,
          createdAt: new Date().toISOString()
        };

        const sessionResponse = await fetch("/api/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(bundle)
        });

        const savedBundle = sessionResponse.ok
          ? ((await sessionResponse.json()) as GeneratedVirtualHumanSession)
          : bundle;

        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(savedBundle));
        setSetupState("entering");
        router.push("/chat");
      } catch (error) {
        setSetupState("idle");
        setSetupError(error instanceof Error ? error.message : "Failed to generate the virtual human session.");
      }
    });
  };

  return (
    <main className="setup-shell">
      <section className="minimal-setup-shell">
        <div className="minimal-setup-head">
          <div>
            <span className="setup-kicker">Setup</span>
            <h1>YaYa</h1>
          </div>
          <span className="minimal-runtime">{runtimeSummary}</span>
        </div>

        <article className="minimal-setup-card minimal-setup-card-compact">
          <section className="minimal-entry-block">
            <div className="minimal-entry-head">
              <div>
                <h2>Import Discord history</h2>
                <p>Choose one Discord conversation to generate the virtual human.</p>
              </div>
              <button className="connect-discord-button" onClick={handleImportDiscordHistory} type="button">
                {isImportingHistory ? "Importing..." : "Import Discord history"}
              </button>
            </div>

            {conversations.length > 0 ? (
              <div className="minimal-contacts-row minimal-contacts-row-wide">
                <select
                  className="setup-text-input setup-text-select"
                  value={selectedConversationId}
                  onChange={(event) => {
                    const nextId = event.target.value;
                    setSelectedConversationId(nextId);
                    const nextConversation = conversations.find((conversation) => conversation.filePath === nextId);
                    setSelectedSpeakerId(nextConversation?.targetOptions[0]?.speakerId ?? "");
                  }}
                >
                  <option value="">Choose one Discord conversation</option>
                  {conversations.map((conversation) => (
                    <option key={conversation.filePath} value={conversation.filePath}>
                      {conversation.label}
                    </option>
                  ))}
                </select>
                <select
                  className="setup-text-input"
                  value={selectedSpeakerId}
                  onChange={(event) => setSelectedSpeakerId(event.target.value)}
                >
                  <option value="">Choose who YaYa should model and keep talking to</option>
                  {selectedConversation?.targetOptions.map((target) => (
                    <option key={target.speakerId} value={target.speakerId}>
                      {target.speakerName}
                    </option>
                  ))}
                </select>
                <select
                  className="setup-text-input"
                  value={historyWindow}
                  onChange={(event) => setHistoryWindow(event.target.value as HistoryWindow)}
                >
                  <option value="100">Last 100 messages</option>
                  <option value="300">Last 300 messages</option>
                  <option value="1000">Last 1000 messages</option>
                  <option value="all">All imported messages</option>
                </select>
              </div>
            ) : null}

            <textarea
              className="setup-textarea minimal-textarea"
              placeholder="The selected Discord conversation will preview here."
              rows={14}
              readOnly
              value={workingTranscript}
            />

            <div className="minimal-meta-row">
              <span className="minimal-meta">{importSummary}</span>
              {selectedConversation ? (
                <span className="minimal-meta">
                  {selectedConversation.label} · {selectedConversation.speakersLine}
                </span>
              ) : null}
            </div>
          </section>

          <section className="minimal-entry-block">
            <div className="minimal-entry-head">
              <div>
                <h2>Connect Discord realtime</h2>
                <p>Use OpenClaw as the relay layer so YaYa can keep talking to the selected target.</p>
              </div>
              <span className="realtime-state-pill">{formatRealtimeState(openClawStatus)}</span>
            </div>

            <div className="minimal-contacts-row minimal-contacts-row-wide">
              <input
                className="setup-text-input setup-token-input"
                placeholder="Discord bot token if OpenClaw is not configured yet"
                type="password"
                value={discordBotToken}
                onChange={(event) => setDiscordBotToken(event.target.value)}
              />
              <button
                className="connect-discord-button"
                disabled={!selectedTarget || isConnectingRealtime}
                onClick={handleConnectRealtime}
                type="button"
              >
                {isConnectingRealtime ? "Connecting..." : "Connect Discord realtime"}
              </button>
            </div>

            <div className="minimal-meta-row">
              <span className="minimal-meta">
                {selectedTarget
                  ? `Live target: ${selectedTarget.speakerName}`
                  : "Choose a target from imported Discord history first."}
              </span>
              {openClawStatus ? <span className="minimal-meta">{openClawStatus.channelStatusLine}</span> : null}
            </div>

            {!realtimeTargetReady && selectedTarget ? (
              <div className="error-banner">
                This target came from a simplified export without a stable Discord user id. Realtime DM routing works
                best with DiscordChatExporter JSON or JSON array imports that preserve ids.
              </div>
            ) : null}
          </section>

          <div className="minimal-setup-footer">
            <button className="primary-action" disabled={isPending || !selectedConversation} onClick={handleGenerateAndEnter} type="button">
              {setupState === "analyzing"
                ? "Analyzing..."
                : setupState === "generating"
                  ? "Generating..."
                  : setupState === "entering"
                    ? "Opening..."
                    : "Generate and enter"}
            </button>
          </div>

          {selectedConversation && selectedConversation.targetOptions.length > 2 ? (
            <div className="error-banner">
              This export includes multiple speakers. Best results come from one DM or one focused Discord thread.
            </div>
          ) : null}
          {historyError ? <div className="error-banner">{historyError}</div> : null}
          {realtimeError ? <div className="error-banner">{realtimeError}</div> : null}
          {setupError ? <div className="error-banner">{setupError}</div> : null}
        </article>
      </section>
    </main>
  );
}
