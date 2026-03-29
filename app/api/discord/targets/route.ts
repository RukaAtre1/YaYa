import { NextResponse } from "next/server";
import { fetchDiscordImportTargets, toApiErrorResponse } from "@/lib/yaya-backend";

export async function GET() {
  try {
    return NextResponse.json(await fetchDiscordImportTargets());
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
