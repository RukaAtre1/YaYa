import { NextResponse } from "next/server";
import { exportDiscordHistory, toApiErrorResponse } from "@/lib/yaya-backend";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      channelId?: string;
      format?: "Json" | "Csv" | "PlainText";
    };

    return NextResponse.json(await exportDiscordHistory(body as { channelId: string; format?: "Json" | "Csv" | "PlainText" }));
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
