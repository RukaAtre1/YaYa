import { ChatPlayground } from "@/components/chat-playground";
import { BulletList } from "@/components/bullet-list";
import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";

export default function ChatPage() {
  return (
    <PageShell
      eyebrow="Chat"
      title="Run the realtime relationship loop."
      description="M2.7 carries the full text loop here: turn understanding, relational phrasing, emotional support, persona consistency, and proactive-style response logic."
    >
      <div className="stack">
        <SectionCard
          title="Live playground"
          subtitle="This client component runs chat, then resolves speech, expression, and ambience through local API routes"
        >
          <ChatPlayground />
        </SectionCard>

        <SectionCard title="What M2.7 is doing" subtitle="Single-model orchestration">
          <BulletList
            items={[
              "Classify whether the turn needs comfort, follow-up, reminder, or light suggestion",
              "Render the reply in a familiar relationship-native tone",
              "Keep persona behavior consistent with the compiled card",
              "Produce reply text plus emotion and action tags for Gemini TTS, avatar state routing, and OpenClaw execution"
            ]}
          />
        </SectionCard>
      </div>
    </PageShell>
  );
}
