"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sampleAvatar, samplePersona, sampleProfile } from "@/lib/demo-data";
import type {
  AmbienceLoop,
  ApiErrorPayload,
  ChatMessage,
  ChatReply,
  ExpressionState,
  GeneratedVirtualHumanSession,
  SpeechSynthesisResult
} from "@/types/yaya";

const SESSION_STORAGE_KEY = "yaya-generated-session";

type RuntimeState = {
  speech: SpeechSynthesisResult | null;
  expression: ExpressionState | null;
  ambience: AmbienceLoop | null;
  speechError: string | null;
};

function resolveVisualMood(state: RuntimeState, emotionTag: string) {
  const cachedState = state.expression?.cachedState ?? "steady-care";

  if (cachedState.includes("concern") || emotionTag.includes("concern")) {
    return "concerned";
  }

  if (cachedState.includes("encouraging") || emotionTag.includes("encouraging")) {
    return "encouraging";
  }

  if (cachedState.includes("playful") || emotionTag.includes("playful")) {
    return "playful";
  }

  return "calm";
}

function buildMemorySummary(bundle: GeneratedVirtualHumanSession) {
  return [
    `Relationship: ${bundle.profile.relationshipLabel}.`,
    `Tone: ${bundle.profile.toneTraits.join(", ")}.`,
    `Care style: ${bundle.profile.careStyle.join("; ")}.`,
    `Recurring concerns: ${bundle.profile.recurringConcerns.join(", ")}.`
  ].join(" ");
}

function buildSourceLabel(bundle: GeneratedVirtualHumanSession) {
  if (bundle.source === "discord") {
    return "Discord";
  }

  if (bundle.source === "wechat") {
    return "WeChat";
  }

  return "Imported session";
}

export function ChatPlayground() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sessionBundle, setSessionBundle] = useState<GeneratedVirtualHumanSession | null>(null);
  const [isReady, setIsReady] = useState(false);
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

  useEffect(() => {
    const saved = window.sessionStorage.getItem(SESSION_STORAGE_KEY);

    const applyBundle = (bundle: GeneratedVirtualHumanSession) => {
      setSessionBundle(bundle);
      setMessages([
        {
          id: "session-intro",
          role: "assistant",
          text: "I'm here.",
          timestamp: new Date().toISOString(),
          turnType: "proactive_check_in"
        }
      ]);
      setIsReady(true);
    };

    if (saved) {
      try {
        applyBundle(JSON.parse(saved) as GeneratedVirtualHumanSession);
        return;
      } catch {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }

    void fetch("/api/session")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No saved session");
        }

        return (await response.json()) as GeneratedVirtualHumanSession;
      })
      .then((bundle) => {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(bundle));
        applyBundle(bundle);
      })
      .catch(() => {
        router.replace("/");
      });
  }, [router]);

  useEffect(() => {
    if (!runtimeState.speech || !audioRef.current) {
      return;
    }

    void audioRef.current.play().catch(() => {
      // Browsers may block autoplay until the user interacts with the page.
    });
  }, [runtimeState.speech]);

  const submit = () => {
    if (!sessionBundle) {
      return;
    }

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
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
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
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            userMessage: trimmed,
            history: nextHistory,
            persona: sessionBundle.persona,
            memorySummary: buildMemorySummary(sessionBundle)
          })
        });

        const payload = (await response.json()) as ChatReply | ApiErrorPayload;

        if (!response.ok) {
          throw new Error((payload as ApiErrorPayload).error.message);
        }

        const reply = payload as ChatReply;
        setMessages((current) => [...current, reply.message]);
        setLastEmotionTag(reply.emotionTag ?? "");
        setLastActionIntent(reply.actionIntent ?? null);

        void Promise.all([
          fetch("/api/speech", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              text: reply.message.text,
              emotionTag: reply.emotionTag
            })
          }),
          fetch("/api/expression", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              emotionTag: reply.emotionTag
            })
          }),
          fetch("/api/ambience", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              emotionTag: reply.emotionTag
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
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "YaYa could not produce a reply.");
      }
    });
  };

  if (!isReady || !sessionBundle) {
    return (
      <section className="call-stage">
        <div className="setup-card">
          <p>Returning to setup...</p>
        </div>
      </section>
    );
  }

  const latestSpeech = runtimeState.speech;
  const audioSrc = latestSpeech
    ? `${latestSpeech.audio.mimeType};base64,${latestSpeech.audio.data}`.replace(
        /^audio\//,
        "data:audio/"
      )
    : "";
  const visualMood = resolveVisualMood(runtimeState, lastEmotionTag);
  const humanName = sessionBundle.persona.name ?? samplePersona.name;
  const humanSummary = sessionBundle.persona.summary ?? samplePersona.summary;
  const visualPrompt = sessionBundle.avatar.visualPrompt ?? sampleAvatar.visualPrompt;
  const careSignature = sessionBundle.profile.careStyle?.[0] ?? sampleProfile.careStyle[0];
  const visualStateLabel = runtimeState.expression?.cachedState ?? `${visualMood} idle`;
  const targetLabel = sessionBundle.discordTarget?.speakerName ?? "current target";

  return (
    <section className="call-stage">
      <div className="minimal-chat-shell">
        <aside className={`minimal-presence-panel visual-${visualMood}`}>
          <div className="minimal-presence-card">
            <div className="virtual-human-stage compact-stage">
              <div className="virtual-human-aura" />
              <div className="virtual-human-card">
                <div className="virtual-human-portrait compact-portrait">
                  <div className="virtual-human-shadow" />
                  <div className="virtual-human-face">
                    <span className="virtual-human-eyes" />
                    <span className="virtual-human-mouth" />
                  </div>
                </div>
                <div className="virtual-human-meta">
                  <strong>{humanName}</strong>
                  <span>{visualStateLabel}</span>
                </div>
              </div>
            </div>
            <div className="minimal-presence-meta">
              <span>{buildSourceLabel(sessionBundle)}</span>
              <span>{lastEmotionTag || "steady_care"}</span>
              <span>{careSignature}</span>
            </div>
            {latestSpeech ? <audio controls preload="none" ref={audioRef} src={audioSrc} /> : null}
          </div>
        </aside>

        <section className="call-sidepanel minimal-chat-panel">
          <div className="call-sidepanel-head minimal-chat-head">
            <div>
              <strong>{humanName}</strong>
              <p>Talking to {targetLabel}</p>
            </div>
            <span>{isPending ? "Thinking..." : "Ready"}</span>
          </div>

          <div className="call-transcript">
            {messages.map((message) => (
              <article
                key={message.id}
                className={message.role === "assistant" ? "call-bubble assistant" : "call-bubble user"}
              >
                <span>{message.role === "assistant" ? humanName : "You"}</span>
                <p>{message.text}</p>
              </article>
            ))}
          </div>

          <div className="call-composer">
            <textarea
              aria-label="Message YaYa"
              className="chat-input"
              placeholder="Message YaYa..."
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="primary-button" disabled={isPending} onClick={submit} type="button">
              {isPending ? "Thinking..." : "Send"}
            </button>
          </div>
        </section>
      </div>

      {(error || runtimeError || runtimeState.speechError) && (
        <div className="call-alerts">
          {error ? <div className="error-banner">{error}</div> : null}
          {runtimeError ? <div className="error-banner">{runtimeError}</div> : null}
          {runtimeState.speechError ? <div className="error-banner">{runtimeState.speechError}</div> : null}
        </div>
      )}

      <div className="call-footer-line minimal-footer-line">
        <span>{buildSourceLabel(sessionBundle)}</span>
        <span>{targetLabel}</span>
        <span>{lastActionIntent ?? "chat"}</span>
        <span>{visualPrompt}</span>
      </div>
    </section>
  );
}
