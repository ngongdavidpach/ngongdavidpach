// ─────────────────────────────────────────────────────────────
// MTN Mobile Money (MoMo) — disbursement client.
//
// This mirrors the shape of the MTN MoMo Open API (disbursement + collection
// products). In production the HTTP calls below hit the sandbox/production
// host returned by `baseURL()`. In this demo they are simulated so the full
// integration contract (token → request → poll/webhook) is exercised without
// external network calls.
// ─────────────────────────────────────────────────────────────

import { makeId } from "../db";

export function baseURL(): string {
  const env = process.env.MTN_MOMO_ENV || "sandbox";
  return env === "production"
    ? "https://momodeveloper.mtn.com"
    : "https://sandbox.momodeveloper.mtn.com";
}

export interface MomoConfig {
  apiUser: string;
  apiKey: string;
  subscriptionKey: string;
  environment: "sandbox" | "production";
}

export function loadConfig(): MomoConfig {
  return {
    apiUser: process.env.MTN_MOMO_API_USER || "junub-mtn-demo",
    apiKey: process.env.MTN_MOMO_API_KEY || "dev-mtn-key",
    subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || "dev-mtn-sub-key",
    environment: (process.env.MTN_MOMO_ENV as MomoConfig["environment"]) || "sandbox",
  };
}

/**
 * Step 1 — exchange API user/key for a bearer access token.
 * In production: POST {base}/disbursement/token/ with Basic auth.
 */
export async function createAccessToken(_cfg: MomoConfig): Promise<string> {
  await delay(120);
  return `mtn_token_${makeId()}`;
}

export interface MomoPaymentRequest {
  msisdn: string; // e.g. 2119xxxxxxx
  amount: number; // in SSP
  currency: "SSP";
  externalId: string; // Junub Pay reference
  payeeNote: string;
  payerMessage: string;
}

export interface MomoPaymentResponse {
  referenceId: string;
  status: "SUCCESSFUL" | "PENDING" | "FAILED";
  reason?: string;
  financialTransactionId?: string;
}

/**
 * Step 2 — request a disbursement to a subscriber.
 * In production: POST {base}/disbursement/v1_0/transfer
 */
export async function requestToPay(
  req: MomoPaymentRequest,
): Promise<MomoPaymentResponse> {
  const cfg = loadConfig();
  await createAccessToken(cfg);
  await delay(420);

  // Simulated outcome distribution for the demo ledger.
  const roll = Math.random();
  if (roll < 0.03) {
    return {
      referenceId: makeId("mtn"),
      status: "FAILED",
      reason: "Subscriber account not active for MoMo",
    };
  }
  return {
    referenceId: makeId("mtn"),
    status: "SUCCESSFUL",
    financialTransactionId: makeId("ftx"),
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
