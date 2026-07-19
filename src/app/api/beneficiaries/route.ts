import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createBeneficiary, listBeneficiaries } from "@/lib/repositories";

export async function GET() {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const beneficiaries = await listBeneficiaries(session.id);
  return NextResponse.json({ beneficiaries });
}

const schema = z.object({
  fullName: z.string().min(2, "Enter the beneficiary's full name."),
  relationship: z.string().min(1, "Enter a relationship."),
  phone: z.string().min(6, "Enter a valid mobile money number."),
  mobileMoneyProvider: z.enum(["MTN", "ZAIN"]),
  city: z.string().min(1, "Enter a city."),
  country: z.string().default("SS"),
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

  const beneficiary = await createBeneficiary({
    ...parsed.data,
    userId: session.id,
  });
  return NextResponse.json({ beneficiary });
}
