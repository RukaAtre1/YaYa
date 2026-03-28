import { NextResponse } from "next/server";
import { fetchAmbience, toApiErrorResponse } from "@/lib/yaya-backend";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { emotionTag?: string };
    return NextResponse.json(await fetchAmbience(body));
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
