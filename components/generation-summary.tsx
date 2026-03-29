import type {
  AvatarProfile,
  ImportNormalizationResult,
  PersonaCard,
  RelationalProfile
} from "@/types/yaya";

type GenerationSummaryProps = {
  importPreview: ImportNormalizationResult | null;
  profile: RelationalProfile | null;
  persona: PersonaCard | null;
  avatar: { avatar: AvatarProfile; model: string } | null;
  setupState: "idle" | "normalizing" | "analyzing" | "generating" | "entering";
};

function buildStageLabel(setupState: GenerationSummaryProps["setupState"]) {
  switch (setupState) {
    case "normalizing":
      return "Preparing imported history";
    case "analyzing":
      return "MiniMax M2.7 is reading the relationship";
    case "generating":
      return "Generating persona and virtual human shell";
    case "entering":
      return "Opening the live session";
    default:
      return "Ready when your import is ready";
  }
}

export function GenerationSummary({
  importPreview,
  profile,
  persona,
  avatar,
  setupState
}: GenerationSummaryProps) {
  const summary =
    profile && persona && avatar
      ? `${persona.name} is grounded in ${profile.relationshipLabel}, speaks with ${
          profile.toneTraits[0] ?? "warm"
        } energy, and enters the session with ${avatar.model} as the portrait base.`
      : importPreview
        ? `YaYa found ${importPreview.rows.length} messages across ${
            importPreview.speakers.length
          } voices. Next it will analyze tone, build one persona, and prepare the visual shell.`
        : "Import relationship history first. Then YaYa turns it into analysis, persona, and one virtual human.";

  return (
    <article className="setup-card">
      <div className="setup-card-head">
        <span>04</span>
        <h2>Generation summary</h2>
      </div>
      <p>{summary}</p>
      <div className="setup-locks">
        <span className="setup-pill">Brain: MiniMax M2.7</span>
        <span className="setup-pill">Speech: Gemini TTS</span>
        <span className="setup-pill">Image layer: Gemini visual boundary</span>
        <span className="setup-pill">Ambience: Lyria 3 Clip</span>
      </div>
      <div className="setup-summary">
        <strong>{buildStageLabel(setupState)}</strong>
        <p>
          {profile
            ? `${profile.toneTraits.join(", ")}. ${profile.careStyle[0] ?? "Comfort-first presence."}`
            : "The current setup mode stays focused on import, generation, and entering the live session."}
        </p>
      </div>
    </article>
  );
}
