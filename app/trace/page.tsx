import { BulletList } from "@/components/bullet-list";
import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";

export default function TracePage() {
  return (
    <PageShell
      eyebrow="Trace"
      title="Show why YaYa behaves this way."
      description="Traceability is one of the main product differentiators. This view explains how imported data, extracted traits, persona rules, and runtime memory combine into each behavior."
    >
      <div className="stack">
        <div className="grid-two">
          <SectionCard title="Behavior supports">
            <BulletList
              items={[
                "Source evidence snippet from imported conversations",
                "Extracted relational trait from M2.7 analysis",
                "Persona rule compiled from the profile",
                "Session or long-term memory signal"
              ]}
            />
          </SectionCard>

          <SectionCard title="Why this matters">
            <BulletList
              items={[
                "Distinguishes YaYa from fixed-role chat products",
                "Lets the user audit uncomfortable behaviors",
                "Makes the demo legible to judges and collaborators",
                "Creates a clean path for future user controls"
              ]}
            />
          </SectionCard>
        </div>

        <SectionCard title="Prototype trace format" subtitle="Suggested UI shape for each message">
          <div className="mono-panel">
            {`{
  "message_id": "reply-123",
  "turn_type": "comfort",
  "profile_traits": ["warm", "brief", "practical care"],
  "evidence_ids": ["ev-1", "ev-3"],
  "memory_used": "User gets overwhelmed and responds better to one next step."
}`}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
