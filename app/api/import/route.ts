import { NextResponse } from "next/server";
import {
  fetchImportFileNormalization,
  fetchImportNormalization,
  fetchImportRows,
  toApiErrorResponse
} from "@/lib/yaya-backend";
import type { ImportFileNormalizationRequest, ImportNormalizationRequest } from "@/types/yaya";

export async function GET() {
  return NextResponse.json(await fetchImportRows());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportNormalizationRequest;
    return NextResponse.json(await fetchImportNormalization(body));
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: {
            code: "import_normalization_failed",
            message: error.message
          }
        },
        { status: 400 }
      );
    }

    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as ImportFileNormalizationRequest;
    return NextResponse.json(await fetchImportFileNormalization(body));
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
