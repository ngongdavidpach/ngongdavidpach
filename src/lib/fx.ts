// ─────────────────────────────────────────────────────────────
// FX (foreign exchange) for the USD → SSP remittance corridor.
//
// In production this consumes a live FX feed plus a liquidity spread.
// Here we use a configurable base rate (admin-managed) with a small, transparent
// spread baked into disbursements — never hidden from the sender.
//
// Pure formatting helpers live in ./format.ts (client-safe).
// ─────────────────────────────────────────────────────────────

import { getDb } from "./db";

export {
  formatUsd,
  formatSsp,
  parseDollars,
  dollarsToCents,
  centsToDollars,
} from "./format";

/** Spread applied on disbursements, in basis points (sender sees mid-market). */
export const SSP_SPREAD_BPS = 150; // 1.5%

export async function getMidRate(): Promise<number> {
  const db = await getDb();
  return db.meta.sspRate;
}

export async function getDisburseRate(): Promise<number> {
  const mid = await getMidRate();
  // We disburse slightly less than mid to absorb FX risk (the spread).
  return Math.round(mid * (1 - SSP_SPREAD_BPS / 10000));
}

/** Convert a USD amount (float dollars) to SSP at the mid rate shown to users. */
export async function usdToSspMid(usd: number): Promise<number> {
  const rate = await getMidRate();
  return Math.round(usd * rate);
}
