import { PageShell } from "@/components/page-shell";
import { PersonaRunner } from "@/components/persona-runner";

export default function PersonaPage() {
  return (
    <PageShell
      eyebrow="Persona"
      title="Compile YaYa from extracted relational patterns."
      description="The persona layer should read like a behavior policy compiled from data. It is not a role prompt pasted over a generic chatbot."
    >
      <div className="stack">
        <PersonaRunner />
      </div>
    </PageShell>
  );
}
