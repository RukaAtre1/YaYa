import { NextResponse } from "next/server";
import { samplePersona } from "@/lib/demo-data";
import { fetchChatReply, toApiErrorResponse } from "@/lib/yaya-backend";
import type { ChatMessage, PersonaCard } from "@/types/yaya";

type ChatRequest = {
  userMessage?: string;
  history?: ChatMessage[];
  persona?: PersonaCard;
  memorySummary?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatRequest;

    const reply = await fetchChatReply({
      userMessage: body.userMessage ?? "",
      history: body.history ?? [],
      persona: body.persona ?? samplePersona,
      memorySummary:
        body.memorySummary ??
        "The user responds well to practical concern, especially around meals, sleep, and overload."
    });

    return NextResponse.json(reply);
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
