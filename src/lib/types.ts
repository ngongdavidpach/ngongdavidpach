// ─────────────────────────────────────────────────────────────
// Junub Pay — core domain types
// ─────────────────────────────────────────────────────────────

export type Role = "member" | "admin";

export type KycStatus = "unverified" | "pending" | "verified" | "rejected";

export type MobileMoneyProvider = "MTN" | "ZAIN";

export type ProviderCategory =
  | "school"
  | "hospital"
  | "utility"
  | "airtime"
  | "government";

export type TransactionType =
  | "bill_payment"
  | "mobile_money"
  | "wallet_topup"
  | "wallet_fee"
  | "refund";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "success"
  | "failed"
  | "reversed";

export type PaymentChannel =
  | "MTN_MOMO"
  | "ZAIN_CASH"
  | "PROVIDER_LEDGER"
  | "WALLET";

export interface User {
  id: string;
  role: Role;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  /** ISO country code of diaspora residence, e.g. "US", "AU", "GB". */
  residenceCountry: string;
  city: string;
  kycStatus: KycStatus;
  /** Pre-funded wallet balance in USD cents (stored as integer to avoid float drift). */
  walletBalanceCents: number;
  createdAt: string;
}

export interface Beneficiary {
  id: string;
  userId: string;
  fullName: string;
  relationship: string;
  phone: string;
  /** Provider used to disburse to this beneficiary. */
  mobileMoneyProvider: MobileMoneyProvider;
  city: string;
  country: string; // ISO, default "SS"
  createdAt: string;
}

export interface ServiceProvider {
  id: string;
  category: ProviderCategory;
  name: string;
  /** Human readable account / customer reference, e.g. school code. */
  accountRef: string;
  city: string;
  /** Tailwind gradient classes for the avatar badge. */
  accent: string;
  verified: boolean;
  /** Optional sub-category label, e.g. "Electricity", "Water". */
  subCategory?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  reference: string; // public reference, e.g. JP-...
  userId: string;
  type: TransactionType;
  category: ProviderCategory | "mobile_money" | "wallet";
  /** Amount the recipient/destination is credited, in USD cents. */
  amountCents: number;
  /** Junub Pay fee in USD cents. */
  feeCents: number;
  /** Total charged to the sender in USD cents (amount + fee, or amount only for wallet top-ups). */
  totalCents: number;
  /** Disbursed amount in South Sudanese Pounds. */
  amountSsp: number;
  /** FX rate applied, SSP per 1 USD. */
  fxRate: number;
  beneficiaryName: string;
  providerName: string;
  channel: PaymentChannel;
  status: TransactionStatus;
  narrative: string;
  /** Reference returned by the mobile-money / provider integration. */
  externalRef?: string;
  failureReason?: string;
  createdAt: string;
  settledAt?: string;
}

export interface LedgerEntry {
  id: string;
  userId: string;
  transactionId?: string;
  /** Positive = credit to wallet, negative = debit. In USD cents. */
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  actorEmail?: string;
  action: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface DBMeta {
  schemaVersion: number;
  seededAt: string;
  /** Reference FX rate SSP per USD, used to seed and as fallback. */
  sspRate: number;
}

export interface Database {
  users: User[];
  beneficiaries: Beneficiary[];
  providers: ServiceProvider[];
  transactions: Transaction[];
  ledger: LedgerEntry[];
  auditLogs: AuditLog[];
  meta: DBMeta;
}

/** Shape of the currently authenticated session. */
export interface SessionUser {
  id: string;
  role: Role;
  email: string;
  fullName: string;
  residenceCountry: string;
}
