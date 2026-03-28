import Link from "next/link";
import { BulletList } from "@/components/bullet-list";
import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";
import { StatGrid } from "@/components/stat-grid";

export default function OverviewPage() {
  return (
    <PageShell
      eyebrow="Overview"
      title="Grow a digital human from relationship data."
      description="This prototype is built around one claim: familiar care patterns can be extracted from user-authorized conversations and turned into a live digital human without starting from a fixed role template."
    >
      <div className="stack">
        <StatGrid
          items={[
            { label: "Text brain", value: "M2.7", hint: "Analysis, persona, orchestration, chat" },
            { label: "Voice", value: "Gemini TTS", hint: "Single TTS layer for live playback" },
            { label: "Visual", value: "Imagen 4", hint: "Static portrait and cached avatar states" },
            { label: "Primary proof", value: "Traceability", hint: "Every behavior tied to extracted evidence" }
          ]}
        />

        <div className="grid-two">
          <SectionCard title="Prototype modules" subtitle="The hackathon surface area">
            <BulletList
              items={[
                "Import authorized WeChat or Discord-style chat exports",
                "Extract relational tone, care style, initiative style, and recurring concerns",
                "Compile a persona card and proactive behavior policy",
                "Generate a lightweight 2D avatar prompt and mood states",
                "Run a realtime familiar chat loop with traceable rationale"
              ]}
            />
          </SectionCard>

          <SectionCard title="Build order" subtitle="Fastest path to a credible demo">
            <div className="flow-grid">
              {[
                "Ingest and normalize one import format",
                "Analyze relational signals with M2.7",
                "Compile a persona card",
                "Generate static avatar assets with Imagen 4",
                "Run text chat and Gemini TTS output"
              ].map((step) => (
                <div key={step} className="flow-step">
                  <strong>{step}</strong>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Start from the main path" subtitle="Each page maps to one product layer">
          <div className="tag-row">
            <Link className="tag" href="/import">
              Import data
            </Link>
            <Link className="tag" href="/analysis">
              Analyze relationship
            </Link>
            <Link className="tag" href="/persona">
              Compile persona
            </Link>
            <Link className="tag" href="/avatar">
              Build avatar
            </Link>
            <Link className="tag" href="/chat">
              Test chat loop
            </Link>
            <Link className="tag" href="/trace">
              Inspect traceability
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
