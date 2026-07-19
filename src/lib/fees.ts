// ─────────────────────────────────────────────────────────────
// Junub Pay fee engine.
//
// Revenue model: transparent transaction fees that deliberately undercut
// traditional money transfer operators (Western Union, MoneyGram, bank wires)
// which typically cost 8–12% all-in on the USD→SSP corridor.
//
// Junub Pay pricing philosophy:
//   • Bill payments (school, medical, utilities) carry the LOWEST fee because
//     paying a verified provider directly is low-risk — no cash to misuse.
//   • Mobile-money disbursements carry a modest fee.
//   • Wallet top-ups are free — we want liquidity on the platform.
// ─────────────────────────────────────────────────────────────

import { centsToDollars, dollarsToCents } from "./format";

export type FeeTier = "bill" | "mobile_money" | "wallet_topup";

interface FeeConfig {
  /** Percentage of the send amount, in basis points (100 bps = 1%). */
  rateBps: number;
  /** Fixed component in USD cents. */
  fixedCents: number;
  /** Minimum fee in USD cents. */
  minCents: number;
  /** Maximum fee in USD cents (keeps large transfers competitive). */
  maxCents: number;
}

export const FEE_SCHEDULE: Record<FeeTier, FeeConfig> = {
  // Direct bill pay — our flagship, lowest-friction product: 1.8%
  bill: { rateBps: 180, fixedCents: 50, minCents: 75, maxCents: 1500 },
  // Mobile money disbursement to a beneficiary wallet: 2.9%
  mobile_money: { rateBps: 290, fixedCents: 50, minCents: 75, maxCents: 1800 },
  // Funding the platform wallet is always free.
  wallet_topup: { rateBps: 0, fixedCents: 0, minCents: 0, maxCents: 0 },
};

export interface FeeQuote {
  tier: FeeTier;
  amountCents: number;
  feeCents: number;
  totalCents: number;
  effectiveRatePct: number;
}

export function quoteFee(tier: FeeTier, amountCents: number): FeeQuote {
  const cfg = FEE_SCHEDULE[tier];
  const variable = Math.round((amountCents * cfg.rateBps) / 10000);
  let fee = variable + cfg.fixedCents;
  fee = Math.max(cfg.minCents, fee);
  fee = Math.min(cfg.maxCents, fee);
  if (tier === "wallet_topup") fee = 0;
  const total = amountCents + fee;
  const effectiveRatePct =
    amountCents > 0 ? (fee / amountCents) * 100 : 0;
  return {
    tier,
    amountCents,
    feeCents: fee,
    totalCents: total,
    effectiveRatePct: Math.round(effectiveRatePct * 100) / 100,
  };
}

// ── Competitor benchmark (for marketing transparency) ──────────
export interface CompetitorFee {
  name: string;
  /** Typical all-in cost as a percentage of amount on this corridor. */
  pct: number;
  fixedCents: number;
  note: string;
}

export const COMPETITORS: CompetitorFee[] = [
  { name: "Western Union", pct: 9.5, fixedCents: 499, note: "Cash pickup + FX margin" },
  { name: "MoneyGram", pct: 8.8, fixedCents: 499, note: "Agent network fees" },
  { name: "Bank wire", pct: 6.5, fixedCents: 2500, note: "SWIFT + correspondent fees" },
  { name: "Cash courier", pct: 12, fixedCents: 0, note: "Informal, high risk of loss" },
];

export function competitorCost(c: CompetitorFee, amountCents: number): number {
  return Math.round((amountCents * c.pct) / 100 + c.fixedCents);
}

export interface SavingsResult {
  junubFeeCents: number;
  competitorCents: number;
  savingsCents: number;
  savingsPct: number;
}

/** Compute Junub Pay savings vs. the average traditional MTO cost. */
export function savingsVsMarket(
  tier: FeeTier,
  amountCents: number,
): SavingsResult {
  const junub = quoteFee(tier, amountCents).feeCents;
  const avg = COMPETITORS
    .map((c) => competitorCost(c, amountCents))
    .reduce((a, b) => a + b, 0) / COMPETITORS.length;
  const savingsCents = Math.max(0, Math.round(avg) - junub);
  return {
    junubFeeCents: junub,
    competitorCents: Math.round(avg),
    savingsCents,
    savingsPct: avg > 0 ? Math.round((savingsCents / avg) * 100) : 0,
  };
}

// Re-export money helpers for convenience.
export { centsToDollars, dollarsToCents };
