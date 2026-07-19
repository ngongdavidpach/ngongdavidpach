import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { mutate } from "@/lib/db";

const schema = z.object({ rate: z.number().int().positive() });

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
  }
  await mutate((db) => {
    db.meta.sspRate = parsed.data.rate;
  });
  return NextResponse.json({ rate: parsed.data.rate });
}
