function collectRecentUserSignals(history = [], userMessage = "") {
  const userTurns = [
    ...history.filter((message) => message?.role === "user").map((message) => String(message.text ?? "").trim()),
    String(userMessage ?? "").trim()
  ].filter(Boolean);

  const recentTurns = userTurns.slice(-6);
  const lowered = recentTurns.join(" ").toLowerCase();
  const signals = [];

  if (lowered.includes("hackathon") || lowered.includes("demo") || lowered.includes("ship")) {
    signals.push("The user is actively shipping and benefits from teammate-style execution help.");
  }

  if (lowered.includes("brief") || lowered.includes("concise") || lowered.includes("short")) {
    signals.push("The user prefers concise replies over long explanations.");
  }

  if (lowered.includes("tired") || lowered.includes("late") || lowered.includes("sleep")) {
    signals.push("Energy and sleep are active context and should shape check-ins.");
  }

  if (lowered.includes("eat") || lowered.includes("food") || lowered.includes("meal")) {
    signals.push("Meals and practical self-care are recurring support topics.");
  }

  if (lowered.includes("plan") || lowered.includes("todo") || lowered.includes("next step")) {
    signals.push("The user often wants a concrete next-step plan instead of generic encouragement.");
  }

  return {
    recentTurns,
    signals
  };
}

export function summarizeMemory(input = {}) {
  const profile = input.profile ?? {};
  const persona = input.persona ?? {};
  const existingSummary = String(input.existingSummary ?? "").trim();
  const { recentTurns, signals } = collectRecentUserSignals(input.history ?? [], input.userMessage ?? "");

  const parts = [
    existingSummary,
    profile.relationshipLabel ? `Relationship: ${profile.relationshipLabel}.` : "",
    Array.isArray(profile.toneTraits) && profile.toneTraits.length > 0
      ? `Tone traits: ${profile.toneTraits.slice(0, 4).join(", ")}.`
      : "",
    Array.isArray(profile.careStyle) && profile.careStyle.length > 0
      ? `Care style: ${profile.careStyle.slice(0, 2).join("; ")}.`
      : "",
    persona.summary ? `Persona: ${persona.summary}` : "",
    signals.join(" "),
    recentTurns.length > 0 ? `Recent user context: ${recentTurns.slice(-3).join(" | ")}.` : ""
  ].filter(Boolean);

  return parts.join(" ");
}
