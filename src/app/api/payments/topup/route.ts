import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { topUpWallet } from "@/lib/services/payments";

const schema = z.object({
  amountCents: z.number().int().positive(),
  source: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input." },
      { status: 400 },
    );
  }

  try {
    const result = await topUpWallet({
      userId: session.id,
      amountCents: parsed.data.amountCents,
      source: parsed.data.source,
    });
    return NextResponse.json({ transaction: result.transaction });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Top-up failed." },
      { status: 400 },
    );
  }
}
