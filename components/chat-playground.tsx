"use client";

import { useState, useTransition } from "react";
import { sampleConversation, samplePersona } from "@/lib/demo-data";
import type {
  AmbienceLoop,
  ApiErrorPayload,
  ChatMessage,
  ChatReply,
  ExpressionState,
  SpeechSynthesisResult
} from "@/types/yaya";

type RuntimeState = {
  speech: SpeechSynthesisResult | null;
  expression: ExpressionState | null;
  ambience: AmbienceLoop | null;
  speechError: string | null;
};

export function ChatPlayground() {
  const [messages, setMessages] = useState<ChatMessage[]>(sampleConversation);
  const [input, setInput] = useState("");
  const [lastRationale, setLastRationale] = useState<string[]>([]);
  const [lastEmotionTag, setLastEmotionTag] = useState("");
  const [lastActionIntent, setLastActionIntent] = useState<string | null>(null);
  const [runtimeState, setRuntimeState] = useState<RuntimeState>({
    speech: null,
    expression: null,
    ambience: null,
    speechError: null
  });
  const [runtimeError, setRuntimeError] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    const trimmed = input.trim();

    if (!trimmed) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toISOString()
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError("");
    setRuntimeError("");
    setRuntimeState({
      speech: null,
      expression: null,
      ambience: null,
      speechError: null
    });

    startTransition(async () => {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userMessage: trimmed,
          history: [...messages, userMessage],
          persona: samplePersona,
          memorySummary:
            "The user often pushes through stress quietly and responds well to practical, familiar care."
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        setError(payload.error.message);
        setMessages((current) => current.filter((message) => message.id !== userMessage.id));
        return;
      }

      const payload = (await response.json()) as ChatReply;
      setMessages((current) => [...current, payload.message]);
      setLastRationale(payload.rationale);
      setLastEmotionTag(payload.emotionTag ?? "");
      setLastActionIntent(payload.actionIntent ?? null);

      void Promise.all([
        fetch("/api/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: payload.message.text,
            emotionTag: payload.emotionTag
          })
        }),
        fetch("/api/expression", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            emotionTag: payload.emotionTag
          })
        }),
        fetch("/api/ambience", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            emotionTag: payload.emotionTag
          })
        })
      ])
        .then(async ([speechResponse, expressionResponse, ambienceResponse]) => {
          const [speechPayload, expressionPayload, ambiencePayload] = await Promise.all([
            speechResponse.json(),
            expressionResponse.json(),
            ambienceResponse.json()
          ]);

          const expression = expressionResponse.ok ? (expressionPayload as ExpressionState) : null;
          const ambience = ambienceResponse.ok ? (ambiencePayload as AmbienceLoop) : null;
          const speech = speechResponse.ok ? (speechPayload as SpeechSynthesisResult) : null;
          const speechError = speechResponse.ok
            ? null
            : (speechPayload as ApiErrorPayload)?.error?.message ?? "Speech synthesis is unavailable.";

          const nonSpeechError = !expressionResponse.ok
            ? (expressionPayload as ApiErrorPayload)?.error?.message
            : !ambienceResponse.ok
              ? (ambiencePayload as ApiErrorPayload)?.error?.message
              : "";

          if (nonSpeechError) {
            setRuntimeError(nonSpeechError);
          }

          setRuntimeState({
            speech,
            expression,
            ambience,
            speechError
          });
        })
        .catch((runtimeFetchError) => {
          setRuntimeError(
            runtimeFetchError instanceof Error
              ? runtimeFetchError.message
              : "Failed to resolve runtime sidecar state."
          );
        });
    });
  };

  const latestSpeech = runtimeState.speech;
  const audioSrc = latestSpeech
    ? `${latestSpeech.audio.mimeType};base64,${latestSpeech.audio.data}`.replace(
        /^audio\//,
        "data:audio/"
      )
    : "";

  return (
    <div className="chat-layout">
      <div className="chat-window">
        {messages.map((message) => (
          <article
            key={message.id}
            className={message.role === "assistant" ? "chat-row assistant" : "chat-row user"}
          >
            <span>{message.role === "assistant" ? "YaYa" : "You"}</span>
            <p>{message.text}</p>
          </article>
        ))}
      </div>

      <div className="chat-controls">
        <textarea
          aria-label="Message YaYa"
          className="chat-input"
          placeholder="Tell YaYa how your day is going..."
          rows={4}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button className="primary-button" disabled={isPending} onClick={submit} type="button">
          {isPending ? "Thinking..." : "Send"}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {runtimeError ? <div className="error-banner">{runtimeError}</div> : null}
      {runtimeState.speechError ? <div className="error-banner">{runtimeState.speechError}</div> : null}

      <div className="trace-panel">
        <h3>Response trace</h3>
        <ul className="bullet-list">
          {lastRationale.length > 0 ? lastRationale.map((item) => <li key={item}>{item}</li>) : null}
        </ul>
        {lastEmotionTag ? (
          <p className="trace-inline">
            `emotionTag`: {lastEmotionTag}
            {lastActionIntent ? ` | actionIntent: ${lastActionIntent}` : " | actionIntent: none"}
          </p>
        ) : null}
        {runtimeState.expression ? (
          <p className="trace-inline">
            Expression cache: {runtimeState.expression.cachedState} via{" "}
            {runtimeState.expression.staticAvatarModel}
          </p>
        ) : null}
        {runtimeState.ambience ? (
          <p className="trace-inline">
            Ambience bucket: {runtimeState.ambience.moodBucket} via {runtimeState.ambience.model}
          </p>
        ) : null}
        {latestSpeech ? (
          <>
            <p className="trace-inline">
              Speech ready: {latestSpeech.input.voiceName} | {latestSpeech.audio.durationMs} ms |{" "}
              {latestSpeech.audio.sampleRateHz} Hz
            </p>
            <audio controls preload="none" src={audioSrc} />
          </>
        ) : null}
        {messages.length > 0 && messages[messages.length - 1]?.role === "assistant" ? (
          <p className="trace-inline">
            Latest assistant turn is compatible with `emotionTag` and `actionIntent` metadata from the
            locked M2.7 runtime.
          </p>
        ) : null}
      </div>
    </div>
  );
}
