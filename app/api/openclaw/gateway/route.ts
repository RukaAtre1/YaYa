import { NextResponse } from "next/server";
import { startOpenClawGateway, toApiErrorResponse } from "@/lib/yaya-backend";

export async function POST() {
  try {
    return NextResponse.json(await startOpenClawGateway());
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
