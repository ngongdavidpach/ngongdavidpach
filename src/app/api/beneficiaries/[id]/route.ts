import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { deleteBeneficiary } from "@/lib/repositories";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getSessionUser();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const ok = await deleteBeneficiary(session.id, params.id);
  if (!ok) return NextResponse.json({ error: "Beneficiary not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
