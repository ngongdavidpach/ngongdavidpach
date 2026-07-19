import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { sendMobileMoney } from "@/lib/services/payments";
import { getUserById } from "@/lib/repositories";

const schema = z.object({
  beneficiaryId: z.string().min(1),
  amountCents: z.number().int().positive(),
  note: z.string().default(""),
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

  const user = await getUserById(session.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await sendMobileMoney({
      userId: session.id,
      beneficiaryId: parsed.data.beneficiaryId,
      amountCents: parsed.data.amountCents,
      note: parsed.data.note,
      payerName: user.fullName,
    });
    return NextResponse.json({ transaction: result.transaction });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment failed." },
      { status: 400 },
    );
  }
}
