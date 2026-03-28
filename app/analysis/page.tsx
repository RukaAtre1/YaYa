import { AnalysisRunner } from "@/components/analysis-runner";
import { PageShell } from "@/components/page-shell";

export default function AnalysisPage() {
  return (
    <PageShell
      eyebrow="Analysis"
      title="Extract the relationship, not just the content."
      description="M2.7 handles summarization and relational pattern extraction in one pass. The output here should be specific enough that later persona behavior is visibly grounded in source evidence."
    >
      <div className="stack">
        <AnalysisRunner />
      </div>
    </PageShell>
  );
}
