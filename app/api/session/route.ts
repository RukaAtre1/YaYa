import { NextResponse } from "next/server";
import {
  fetchLatestGeneratedSession,
  saveGeneratedSession,
  toApiErrorResponse
} from "@/lib/yaya-backend";
import type { GeneratedVirtualHumanSession } from "@/types/yaya";

export async function GET() {
  try {
    return NextResponse.json(await fetchLatestGeneratedSession());
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeneratedVirtualHumanSession;
    return NextResponse.json(await saveGeneratedSession(body));
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
