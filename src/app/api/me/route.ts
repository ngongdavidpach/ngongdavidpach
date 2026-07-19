import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserById } from "@/lib/repositories";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  const user = await getUserById(session.id);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      residenceCountry: user.residenceCountry,
      city: user.city,
      phone: user.phone,
      kycStatus: user.kycStatus,
      walletBalanceCents: user.walletBalanceCents,
      createdAt: user.createdAt,
    },
  });
}
