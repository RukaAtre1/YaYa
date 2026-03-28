import { NextResponse } from "next/server";
import { fetchAvatar } from "@/lib/yaya-backend";

export async function GET() {
  return NextResponse.json(await fetchAvatar());
}
