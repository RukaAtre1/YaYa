import { NextResponse } from "next/server";
import { fetchSpeech, toApiErrorResponse } from "@/lib/yaya-backend";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      text?: string;
      message?: { text?: string };
      emotionTag?: string;
      voiceName?: string;
    };

    return NextResponse.json(await fetchSpeech(body));
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
