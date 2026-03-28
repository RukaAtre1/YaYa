import { NextResponse } from "next/server";
import { sampleProfile } from "@/lib/demo-data";
import { fetchPersona, toApiErrorResponse } from "@/lib/yaya-backend";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { profile?: typeof sampleProfile };
    const persona = await fetchPersona(body.profile ?? sampleProfile);

    return NextResponse.json(persona);
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
