import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { payBill } from "@/lib/services/payments";
import { getUserById } from "@/lib/repositories";

const schema = z.object({
  providerId: z.string().min(1),
  customerRef: z.string().min(1, "A reference is required."),
  amountCents: z.number().int().positive(),
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
    const result = await payBill({
      userId: session.id,
      providerId: parsed.data.providerId,
      customerRef: parsed.data.customerRef,
      amountCents: parsed.data.amountCents,
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
