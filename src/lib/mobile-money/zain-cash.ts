// ─────────────────────────────────────────────────────────────
// Zain Cash — disbursement client.
//
// Mirrors the Zain Cash South Sudan merchant API: create a transaction against
// a merchant secret, then confirm/settle. Simulated here.
// ─────────────────────────────────────────────────────────────

import { makeId } from "../db";

export interface ZainConfig {
  merchantId: string;
  merchantSecret: string;
  environment: "sandbox" | "production";
}

export function loadConfig(): ZainConfig {
  return {
    merchantId: process.env.ZAIN_CASH_MERCHANT_ID || "junub-zain-demo",
    merchantSecret: process.env.ZAIN_CASH_MERCHANT_SECRET || "dev-zain-secret",
    environment:
      (process.env.ZAIN_CASH_ENV as ZainConfig["environment"]) || "sandbox",
  };
}

export function baseURL(): string {
  return "https://api.zaincash.com";
}

export interface ZainPaymentRequest {
  msisdn: string;
  amount: number; // SSP
  currency: "SSP";
  orderId: string; // Junub Pay reference
  description: string;
}

export interface ZainPaymentResponse {
  transactionId: string;
  status: "success" | "pending" | "failed";
  reason?: string;
}

export async function initiatePayment(
  req: ZainPaymentRequest,
): Promise<ZainPaymentResponse> {
  const cfg = loadConfig();
  // Sign the request payload with the merchant secret (HMAC).
  void signPayload(req, cfg.merchantSecret);
  await delay(380);

  const roll = Math.random();
  if (roll < 0.03) {
    return {
      transactionId: makeId("zc"),
      status: "failed",
      reason: "Insufficient funds in recipient wallet",
    };
  }
  return { transactionId: makeId("zc"), status: "success" };
}

/** HMAC-SHA256 signature of the canonical request — mirrors the real flow. */
export async function signPayload(
  payload: unknown,
  secret: string,
): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, data);
  return Buffer.from(new Uint8Array(sig)).toString("base64");
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
