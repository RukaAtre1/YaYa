import { BulletList } from "@/components/bullet-list";
import { PageShell } from "@/components/page-shell";
import { SectionCard } from "@/components/section-card";
import { sampleAvatar } from "@/lib/demo-data";

export default function AvatarPage() {
  return (
    <PageShell
      eyebrow="Avatar"
      title="Keep the visual layer lightweight and coherent."
      description="This scaffold assumes Imagen 4 produces the polished static portrait set. V1 should rely on cached avatar states and keep dynamic Gemini image updates optional."
    >
      <div className="stack">
        <div className="grid-two">
          <SectionCard title="Avatar prompt" subtitle="Starter prompt passed to Imagen 4">
            <div className="prompt-box">{sampleAvatar.visualPrompt}</div>
          </SectionCard>

          <SectionCard title="Visual direction" subtitle="Prototype mood states and palette">
            <div className="avatar-card">
              <p>Mood states</p>
              <div className="tag-row">
                {sampleAvatar.moodStates.map((state) => (
                  <span key={state} className="tag">
                    {state}
                  </span>
                ))}
              </div>
              <p>Palette</p>
              <div className="tag-row">
                {sampleAvatar.palette.map((color) => (
                  <span key={color} className="tag">
                    {color}
                  </span>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <SectionCard title="Asset strategy" subtitle="What Imagen 4 is responsible for">
          <BulletList
            items={[
              "One base portrait for the default idle state",
              "Three to four alternate expressions for concern, encouragement, and warmth",
              "A consistent prompt style that matches the inferred relational tone",
              "No dependency on dynamic image generation in v1"
            ]}
          />
        </SectionCard>
      </div>
    </PageShell>
  );
}
