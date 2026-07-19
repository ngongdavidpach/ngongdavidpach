import { NextResponse } from "next/server";
import { z } from "zod";
import { findUserByEmail } from "@/lib/repositories";
import {
  createSessionToken,
  setSessionCookie,
  toSessionUser,
  verifyPassword,
} from "@/lib/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

export async function POST(req: Request) {
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

  const user = await findUserByEmail(parsed.data.email);
  if (!user) {
    return NextResponse.json(
      { error: "No account found with that email." },
      { status: 401 },
    );
  }
  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const token = await createSessionToken(user);
  await setSessionCookie(token);
  return NextResponse.json({ user: toSessionUser(user) });
}
