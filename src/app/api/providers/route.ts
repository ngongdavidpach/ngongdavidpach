import { NextResponse } from "next/server";
import { listProviders } from "@/lib/repositories";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") || undefined;
  const providers = await listProviders(category);
  return NextResponse.json({ providers });
}
