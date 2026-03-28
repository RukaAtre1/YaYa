"use client";

import { useState, useTransition } from "react";
import { samplePersona, sampleProfile } from "@/lib/demo-data";
import type { ApiErrorPayload, PersonaCard } from "@/types/yaya";
import { BulletList } from "@/components/bullet-list";
import { SectionCard } from "@/components/section-card";

export function PersonaRunner() {
  const [persona, setPersona] = useState<PersonaCard>(samplePersona);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const generatePersona = () => {
    setError("");

    startTransition(async () => {
      const response = await fetch("/api/persona", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ profile: sampleProfile })
      });

      if (!response.ok) {
        const payload = (await response.json()) as ApiErrorPayload;
        setError(payload.error.message);
        return;
      }

      const payload = (await response.json()) as PersonaCard;
      setPersona(payload);
    });
  };

  return (
    <div className="stack">
      <button className="primary-button" disabled={isPending} onClick={generatePersona} type="button">
        {isPending ? "Compiling..." : "Compile persona with M2.7"}
      </button>

      {error ? <div className="error-banner">{error}</div> : null}

      <SectionCard title={persona.name} subtitle={persona.summary}>
        <div className="grid-two">
          <div>
            <h3>Speaking rules</h3>
            <BulletList items={persona.speakingRules} />
          </div>
          <div>
            <h3>Proactive patterns</h3>
            <BulletList items={persona.proactivePatterns} />
          </div>
        </div>
      </SectionCard>

      <div className="grid-two">
        <SectionCard title="Comfort style">
          <BulletList items={persona.comfortStyle} />
        </SectionCard>
        <SectionCard title="Boundaries">
          <BulletList items={persona.boundaries} />
        </SectionCard>
      </div>
    </div>
  );
}
