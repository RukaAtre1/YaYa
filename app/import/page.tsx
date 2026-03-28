import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";
import { sampleMessages } from "@/lib/demo-data";

export default function ImportPage() {
  return (
    <PageShell
      eyebrow="Import"
      title="Ingest user-authorized conversation data."
      description="The first prototype only needs one or two clean import formats. The important part is a normalized schema that can feed relational analysis and later trace behavior back to source evidence."
    >
      <div className="stack">
        <div className="grid-two">
          <SectionCard title="Upload surface" subtitle="Prototype UI placeholder">
            <div className="upload-box">
              <strong>Drop chat export here</strong>
              <p>Accept a small, opinionated set of formats first. Parse into thread, speaker, timestamp, and text.</p>
            </div>
          </SectionCard>

          <SectionCard title="Normalized fields" subtitle="Minimum schema for the demo">
            <div className="mono-panel">
              {`{
  "threadId": "thread-mom",
  "speakerName": "Mom",
  "timestamp": "2026-03-25T08:00:00Z",
  "text": "Did you eat before class?",
  "source": "wechat"
}`}
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Sample imported rows" subtitle="Demo records used by the scaffold">
          <div className="stack">
            {sampleMessages.map((message) => (
              <div key={message.id} className="flow-step">
                <strong>
                  {message.speakerName} · {new Date(message.timestamp).toLocaleString()}
                </strong>
                <span>{message.text}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}

