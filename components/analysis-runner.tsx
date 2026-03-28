"use client";

import { useState, useTransition } from "react";
import { sampleMessages, sampleProfile } from "@/lib/demo-data";
import type { ApiErrorPayload, RelationalProfile } from "@/types/yaya";
import { BulletList } from "@/components/bullet-list";
import { SectionCard } from "@/components/section-card";

const defaultTranscript = sampleMessages
  .map((message) => `[${message.speakerName}] ${message.text}`)
  .join("\n");

export function AnalysisRunner() {
  const [transcript, setTranscript] = useState(defaultTranscript);
  const [profile, setProfile] = useState<RelationalProfile | null>(sampleProfile);
  const [error, setError] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const runAnalysis = () => {
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ transcript })
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        setError(payload.error.message);
        return;
      }

      const payload = (await response.json()) as RelationalProfile;
      setProfile(payload);
    });
  };

  return (
    <div className="stack">
      <div className="chat-controls">
        <textarea
          className="chat-input"
          rows={10}
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
        />
        <button className="primary-button" disabled={isPending} onClick={runAnalysis} type="button">
          {isPending ? "Analyzing..." : "Run M2.7 analysis"}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      {profile ? (
        <>
          <div className="grid-three">
            <SectionCard title="Tone traits">
              <BulletList items={profile.toneTraits} />
            </SectionCard>
            <SectionCard title="Care style">
              <BulletList items={profile.careStyle} />
            </SectionCard>
            <SectionCard title="Initiative style">
              <BulletList items={profile.initiativeStyle} />
            </SectionCard>
          </div>

          <SectionCard title="Recurring concerns">
            <div className="tag-row">
              {profile.recurringConcerns.map((concern) => (
                <span key={concern} className="tag">
                  {concern}
                </span>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Evidence snippets">
            <div className="stack">
              {profile.evidence.map((snippet) => (
                <div key={snippet.id} className="flow-step">
                  <strong>{snippet.reason}</strong>
                  <span>
                    {snippet.speakerName}: "{snippet.text}"
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        </>
      ) : null}
    </div>
  );
}

