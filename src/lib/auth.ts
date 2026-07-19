import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { SessionUser, User } from "./types";

export const SESSION_COOKIE = "junub_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function secret(): Uint8Array {
  const raw =
    process.env.JUNUB_SESSION_SECRET ||
    "dev-secret-change-me-in-production-32chars";
  return new TextEncoder().encode(raw.padEnd(32, "0"));
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function toSessionUser(u: User): SessionUser {
  return {
    id: u.id,
    role: u.role,
    email: u.email,
    fullName: u.fullName,
    residenceCountry: u.residenceCountry,
  };
}

export async function createSessionToken(user: User): Promise<string> {
  return new SignJWT({ ...toSessionUser(user) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      typeof payload.sub === "string" &&
      typeof payload.email === "string" &&
      typeof payload.fullName === "string"
    ) {
      return {
        id: payload.sub,
        role: (payload.role as SessionUser["role"]) || "member",
        email: payload.email,
        fullName: payload.fullName,
        residenceCountry: (payload.residenceCountry as string) || "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

/** Read & verify the current session from the request cookies. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
}
