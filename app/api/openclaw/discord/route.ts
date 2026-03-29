import { NextResponse } from "next/server";
import {
  connectOpenClawDiscord,
  fetchOpenClawDiscordStatus,
  toApiErrorResponse
} from "@/lib/yaya-backend";

export async function GET() {
  try {
    return NextResponse.json(await fetchOpenClawDiscordStatus());
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { token?: string };
    return NextResponse.json(await connectOpenClawDiscord(body));
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
