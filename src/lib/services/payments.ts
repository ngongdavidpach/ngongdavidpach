// ─────────────────────────────────────────────────────────────
// Payment orchestration.
//
// Three flows:
//   1. payBill        — diaspora pays a verified provider directly (school,
//                       hospital, utility). Funds never become cash.
//   2. sendMobileMoney — disburse to a beneficiary's MTN MoMo / Zain wallet.
//   3. topUpWallet    — fund the platform wallet from a card/bank (mocked).
//
// Every outbound flow: quote fee → debit wallet → record tx → call rail →
// settle (or reverse + refund on failure) → audit.
// ─────────────────────────────────────────────────────────────

import { getDb } from "../db";
import { getDisburseRate } from "../fx";
import { quoteFee, type FeeTier } from "../fees";
import { disburse } from "../mobile-money";
import { customerRefLabel, postProviderPayment } from "../providers";
import {
  adjustWallet,
  audit,
  getWalletBalance,
  listBeneficiaries,
  recordTransaction,
  setTransactionStatus,
} from "../repositories";
import type {
  PaymentChannel,
  ProviderCategory,
  Transaction,
  TransactionStatus,
} from "../types";

export interface PayResult {
  transaction: Transaction;
}

function settleStatus(ok: boolean): TransactionStatus {
  return ok ? "success" : "failed";
}

export interface PayBillInput {
  userId: string;
  providerId: string;
  customerRef: string;
  amountCents: number;
  payerName: string;
}

export async function payBill(input: PayBillInput): Promise<PayResult> {
  const db = await getDb();
  const provider = db.providers.find((p) => p.id === input.providerId);
  if (!provider) throw new Error("Service provider not found.");
  if (!input.customerRef.trim()) {
    throw new Error(`A ${customerRefLabel(provider.category)} is required.`);
  }
  if (input.amountCents < 100) throw new Error("Minimum payment is $1.00.");

  const quote = quoteFee("bill", input.amountCents);
  const fxRate = await getDisburseRate();
  const amountSsp = Math.round((input.amountCents / 100) * fxRate);

  // Debit wallet for amount + fee.
  const balance = await getWalletBalance(input.userId);
  if (balance < quote.totalCents) {
    throw new Error(
      "Insufficient wallet balance. Please top up your wallet first.",
    );
  }

  const narrative = `${provider.name} • ${customerRefLabel(provider.category)} ${input.customerRef}`;

  // Record the outbound transaction in processing state.
  const tx = await recordTransaction({
    userId: input.userId,
    type: "bill_payment",
    category: provider.category as ProviderCategory,
    amountCents: quote.amountCents,
    feeCents: quote.feeCents,
    totalCents: quote.totalCents,
    amountSsp,
    fxRate,
    beneficiaryName: provider.name,
    providerName: provider.name,
    channel: "PROVIDER_LEDGER",
    status: "processing",
    narrative,
  });

  // Debit the wallet against this transaction.
  const debit = await adjustWallet(
    input.userId,
    -quote.totalCents,
    `Bill payment: ${narrative}`,
    tx.id,
  );
  if (!debit.ok) {
    await setTransactionStatus(tx.reference, "failed", {
      failureReason: debit.message,
    });
    throw new Error(debit.message || "Wallet debit failed");
  }

  // Settle against the provider ledger.
  const result = await postProviderPayment({
    providerId: provider.id,
    amountSsp,
    customerRef: input.customerRef,
    payerName: input.payerName,
    narrative,
  });

  const status = settleStatus(result.ok);
  await setTransactionStatus(tx.reference, status, {
    externalRef: result.settlementRef,
    failureReason: result.ok ? undefined : result.message,
    settledAt: result.ok ? new Date().toISOString() : undefined,
  });

  if (!result.ok) {
    // Reverse: refund amount + fee to wallet.
    await adjustWallet(
      input.userId,
      quote.totalCents,
      `Refund: failed bill payment ${tx.reference}`,
      tx.id,
    );
    await setTransactionStatus(tx.reference, "reversed", {
      failureReason: result.message,
    });
    await audit("bill_payment.reversed", { ref: tx.reference, reason: result.message }, input.userId);
    throw new Error(result.message);
  }

  await audit("bill_payment.success", { ref: tx.reference, provider: provider.name, amountSsp }, input.userId);

  const updated = await getDb();
  const finalTx = updated.transactions.find((t) => t.id === tx.id) || tx;
  return { transaction: finalTx };
}

export interface SendMoMoInput {
  userId: string;
  beneficiaryId: string;
  amountCents: number;
  note: string;
  payerName: string;
}

export async function sendMobileMoney(input: SendMoMoInput): Promise<PayResult> {
  const beneficiaries = await listBeneficiaries(input.userId);
  const beneficiary = beneficiaries.find((b) => b.id === input.beneficiaryId);
  if (!beneficiary) throw new Error("Beneficiary not found.");
  if (input.amountCents < 100) throw new Error("Minimum send is $1.00.");

  const quote = quoteFee("mobile_money", input.amountCents);
  const fxRate = await getDisburseRate();
  const amountSsp = Math.round((input.amountCents / 100) * fxRate);

  const balance = await getWalletBalance(input.userId);
  if (balance < quote.totalCents) {
    throw new Error("Insufficient wallet balance. Please top up your wallet first.");
  }

  const narrative = `${beneficiary.fullName} (${beneficiary.mobileMoneyProvider})${input.note ? ` — ${input.note}` : ""}`;

  const tx = await recordTransaction({
    userId: input.userId,
    type: "mobile_money",
    category: "mobile_money",
    amountCents: quote.amountCents,
    feeCents: quote.feeCents,
    totalCents: quote.totalCents,
    amountSsp,
    fxRate,
    beneficiaryName: beneficiary.fullName,
    providerName: beneficiary.mobileMoneyProvider === "MTN" ? "MTN MoMo" : "Zain Cash",
    channel: (beneficiary.mobileMoneyProvider === "MTN" ? "MTN_MOMO" : "ZAIN_CASH") as PaymentChannel,
    status: "processing",
    narrative,
  });

  const debit = await adjustWallet(
    input.userId,
    -quote.totalCents,
    `Mobile money send: ${narrative}`,
    tx.id,
  );
  if (!debit.ok) {
    await setTransactionStatus(tx.reference, "failed", { failureReason: debit.message });
    throw new Error(debit.message || "Wallet debit failed");
  }

  const result = await disburse({
    provider: beneficiary.mobileMoneyProvider,
    amountSsp,
    phone: beneficiary.phone,
    externalId: tx.reference,
    note: input.note || `Junub Pay transfer from ${input.payerName}`,
  });

  const status = settleStatus(result.ok);
  await setTransactionStatus(tx.reference, status, {
    externalRef: result.providerReference,
    failureReason: result.ok ? undefined : result.message,
    settledAt: result.ok ? new Date().toISOString() : undefined,
  });

  if (!result.ok) {
    await adjustWallet(
      input.userId,
      quote.totalCents,
      `Refund: failed mobile money send ${tx.reference}`,
      tx.id,
    );
    await setTransactionStatus(tx.reference, "reversed", { failureReason: result.message });
    await audit("mobile_money.reversed", { ref: tx.reference, reason: result.message }, input.userId);
    throw new Error(result.message);
  }

  await audit("mobile_money.success", { ref: tx.reference, beneficiary: beneficiary.fullName, amountSsp }, input.userId);

  const updated = await getDb();
  const finalTx = updated.transactions.find((t) => t.id === tx.id) || tx;
  return { transaction: finalTx };
}

export interface TopUpInput {
  userId: string;
  amountCents: number;
  source: string; // e.g. "Visa •••• 4242"
}

export async function topUpWallet(input: TopUpInput): Promise<PayResult> {
  if (input.amountCents < 500) throw new Error("Minimum top-up is $5.00.");
  const quote = quoteFee("wallet_topup", input.amountCents); // free

  // Simulate card authorization (always succeeds in demo).
  await new Promise((r) => setTimeout(r, 250));

  const credit = await adjustWallet(
    input.userId,
    quote.amountCents,
    `Wallet top-up from ${input.source}`,
  );
  if (!credit.ok) throw new Error(credit.message || "Top-up failed");

  const tx = await recordTransaction({
    userId: input.userId,
    type: "wallet_topup",
    category: "wallet",
    amountCents: quote.amountCents,
    feeCents: quote.feeCents,
    totalCents: quote.amountCents,
    amountSsp: 0,
    fxRate: 0,
    beneficiaryName: "Junub Pay Wallet",
    providerName: input.source,
    channel: "WALLET",
    status: "success",
    narrative: `Wallet top-up from ${input.source}`,
    settledAt: new Date().toISOString(),
  });

  await audit("wallet.topup", { ref: tx.reference, amountCents: input.amountCents }, input.userId);
  return { transaction: tx };
}

/** Recompute a quote client + server share. Exposed for preview. */
export function previewQuote(tier: FeeTier, amountCents: number) {
  return quoteFee(tier, amountCents);
}
