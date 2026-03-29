import { NextResponse } from "next/server";
import { checkProactiveState, toApiErrorResponse } from "@/lib/yaya-backend";
import type { GeneratedVirtualHumanSession } from "@/types/yaya";

type ProactiveRequest = {
  session?: GeneratedVirtualHumanSession | null;
  timezone?: string;
  nowIso?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ProactiveRequest;

    return NextResponse.json(
      await checkProactiveState({
        session: body.session ?? null,
        timezone: body.timezone,
        nowIso: body.nowIso
      })
    );
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
