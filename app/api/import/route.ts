import { NextResponse } from "next/server";
import { fetchImportRows } from "@/lib/yaya-backend";

export async function GET() {
  return NextResponse.json(await fetchImportRows());
}
