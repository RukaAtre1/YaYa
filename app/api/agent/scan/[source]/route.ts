import { NextResponse } from "next/server";
import { fetchLocalAgentScan, toApiErrorResponse } from "@/lib/yaya-backend";

type RouteContext = {
  params: Promise<{
    source: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { source } = await context.params;

    if (source !== "discord" && source !== "wechat") {
      return NextResponse.json(
        {
          error: {
            code: "scan_source_invalid",
            message: "Unsupported scan source."
          }
        },
        { status: 400 }
      );
    }

    return NextResponse.json(await fetchLocalAgentScan(source));
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
