import { NextResponse } from "next/server";
import { z } from "zod";
import { createUser } from "@/lib/repositories";
import {
  createSessionToken,
  setSessionCookie,
  toSessionUser,
} from "@/lib/auth";

const schema = z.object({
  fullName: z.string().min(2, "Please enter your full name."),
  email: z.string().email("Enter a valid email."),
  phone: z.string().min(5, "Enter a phone number."),
  residenceCountry: z.string().min(2),
  city: z.string().min(1, "Enter your city."),
  password: z.string().min(8, "Password must be at least 8 characters."),
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

  try {
    const user = await createUser(parsed.data);
    const token = await createSessionToken(user);
    await setSessionCookie(token);
    return NextResponse.json({ user: toSessionUser(user) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Registration failed." },
      { status: 400 },
    );
  }
}
