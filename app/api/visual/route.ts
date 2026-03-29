import { NextResponse } from "next/server";
import { fetchVisualFrame, toApiErrorResponse } from "@/lib/yaya-backend";
import type { PersonaCard, RelationalProfile } from "@/types/yaya";

type VisualRequest = {
  persona?: PersonaCard;
  profile?: RelationalProfile;
  avatarPrompt?: string;
  emotionTag?: string;
  latestUserMessage?: string;
  latestAssistantMessage?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VisualRequest;

    const payload = await fetchVisualFrame({
      persona: body.persona ?? {
        name: "YaYa",
        summary: "",
        speakingRules: [],
        proactivePatterns: [],
        comfortStyle: [],
        boundaries: []
      },
      profile: body.profile ?? {
        relationshipLabel: "",
        toneTraits: [],
        careStyle: [],
        initiativeStyle: [],
        recurringConcerns: [],
        languageHabits: [],
        evidence: []
      },
      avatarPrompt: body.avatarPrompt ?? "",
      emotionTag: body.emotionTag,
      latestUserMessage: body.latestUserMessage,
      latestAssistantMessage: body.latestAssistantMessage
    });

    return NextResponse.json(payload);
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
