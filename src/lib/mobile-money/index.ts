// ─────────────────────────────────────────────────────────────
// Unified Mobile Money dispatcher.
//
// Normalizes MTN MoMo and Zain Cash behind one interface so the payment
// service doesn't care which rail a beneficiary uses.
// ─────────────────────────────────────────────────────────────

import type { MobileMoneyProvider } from "../types";
import * as mtn from "./mtn-momo";
import * as zain from "./zain-cash";

export interface DisbursementRequest {
  provider: MobileMoneyProvider;
  amountSsp: number;
  phone: string;
  externalId: string;
  note: string;
}

export interface DisbursementResult {
  ok: boolean;
  provider: MobileMoneyProvider;
  providerReference: string;
  status: "success" | "pending" | "failed";
  message: string;
}

export async function disburse(
  req: DisbursementRequest,
): Promise<DisbursementResult> {
  try {
    if (req.provider === "MTN") {
      const res = await mtn.requestToPay({
        msisdn: normalizeMsisdn(req.phone),
        amount: Math.round(req.amountSsp),
        currency: "SSP",
        externalId: req.externalId,
        payeeNote: req.note,
        payerMessage: req.note,
      });
      return {
        ok: res.status === "SUCCESSFUL",
        provider: "MTN",
        providerReference: res.financialTransactionId || res.referenceId,
        status:
          res.status === "SUCCESSFUL"
            ? "success"
            : res.status === "PENDING"
              ? "pending"
              : "failed",
        message: res.reason || (res.status === "SUCCESSFUL" ? "Disbursed via MTN MoMo" : "MTN MoMo returned a non-success status"),
      };
    }

    // Zain
    const res = await zain.initiatePayment({
      msisdn: normalizeMsisdn(req.phone),
      amount: Math.round(req.amountSsp),
      currency: "SSP",
      orderId: req.externalId,
      description: req.note,
    });
    return {
      ok: res.status === "success",
      provider: "ZAIN",
      providerReference: res.transactionId,
      status: res.status,
      message: res.reason || (res.status === "success" ? "Disbursed via Zain Cash" : "Zain Cash returned a non-success status"),
    };
  } catch (err) {
    return {
      ok: false,
      provider: req.provider,
      providerReference: "",
      status: "failed",
      message: err instanceof Error ? err.message : "Mobile money provider error",
    };
  }
}

/** Normalize a South Sudanese MSISDN to international format (211…). */
export function normalizeMsisdn(phone: string): string {
  let p = phone.replace(/[^\d+]/g, "");
  if (p.startsWith("+")) p = p.slice(1);
  if (p.startsWith("00")) p = p.slice(2);
  // South Sudan country code is 211. Local numbers are 9 digits (e.g. 9XXXXXXXX).
  if (p.length === 9 && !p.startsWith("211")) p = `211${p}`;
  if (p.startsWith("0")) p = `211${p.slice(1)}`;
  return p;
}
