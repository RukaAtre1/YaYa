import { NextResponse } from "next/server";
import { fetchBackendHealth, toApiErrorResponse } from "@/lib/yaya-backend";

export async function GET() {
  try {
    return NextResponse.json(await fetchBackendHealth());
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
