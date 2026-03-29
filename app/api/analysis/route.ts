import { NextResponse } from "next/server";
import { fetchAnalysis, toApiErrorResponse } from "@/lib/yaya-backend";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { transcript?: string };
    const transcript = body.transcript ?? "";
    const profile = await fetchAnalysis(transcript, true);

    return NextResponse.json(profile);
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
