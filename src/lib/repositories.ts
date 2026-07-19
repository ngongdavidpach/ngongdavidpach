// ─────────────────────────────────────────────────────────────
// Data-access repositories + wallet ledger bookkeeping.
// All mutations go through `mutate()` so writes persist atomically.
// ─────────────────────────────────────────────────────────────

import { getDb, makeId, mutate } from "./db";
import { hashPassword } from "./auth";
import type {
  Beneficiary,
  Database,
  ServiceProvider,
  Transaction,
  TransactionStatus,
  User,
} from "./types";

// ── Users ──────────────────────────────────────────────────────
export async function findUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function getUserById(id: string): Promise<User | undefined> {
  const db = await getDb();
  return db.users.find((u) => u.id === id);
}

export interface NewUserInput {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  residenceCountry: string;
  city: string;
}

export async function createUser(input: NewUserInput): Promise<User> {
  const existing = await findUserByEmail(input.email);
  if (existing) throw new Error("An account with that email already exists.");

  const passwordHash = await hashPassword(input.password);
  return mutate((db) => {
    const user: User = {
      id: makeId("usr"),
      role: db.users.length === 0 ? "admin" : "member", // first account seeds admin
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone,
      residenceCountry: input.residenceCountry,
      city: input.city,
      kycStatus: "pending",
      walletBalanceCents: 0,
      createdAt: new Date().toISOString(),
    };
    db.users.push(user);
    return user;
  });
}

// ── Beneficiaries ──────────────────────────────────────────────
export async function listBeneficiaries(userId: string): Promise<Beneficiary[]> {
  const db = await getDb();
  return db.beneficiaries
    .filter((b) => b.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createBeneficiary(
  input: Omit<Beneficiary, "id" | "createdAt">,
): Promise<Beneficiary> {
  return mutate((db) => {
    const b: Beneficiary = {
      ...input,
      id: makeId("ben"),
      createdAt: new Date().toISOString(),
    };
    db.beneficiaries.push(b);
    return b;
  });
}

export async function deleteBeneficiary(
  userId: string,
  id: string,
): Promise<boolean> {
  return mutate((db) => {
    const before = db.beneficiaries.length;
    db.beneficiaries = db.beneficiaries.filter(
      (b) => !(b.id === id && b.userId === userId),
    );
    return db.beneficiaries.length < before;
  });
}

// ── Service providers ──────────────────────────────────────────
export async function listProviders(category?: string): Promise<ServiceProvider[]> {
  const db = await getDb();
  return db.providers
    .filter((p) => (category ? p.category === category : true))
    .sort((a, b) => Number(b.verified) - Number(a.verified) || a.name.localeCompare(b.name));
}

// ── Transactions ───────────────────────────────────────────────
export async function listUserTransactions(userId: string): Promise<Transaction[]> {
  const db = await getDb();
  return db.transactions
    .filter((t) => t.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listAllTransactions(): Promise<Transaction[]> {
  const db = await getDb();
  return [...db.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTransactionByRef(ref: string): Promise<Transaction | undefined> {
  const db = await getDb();
  return db.transactions.find((t) => t.reference === ref);
}

export function nextReference(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-6);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `JP-${stamp}${rand}`;
}

export async function recordTransaction(
  input: Omit<Transaction, "id" | "reference" | "createdAt">,
): Promise<Transaction> {
  return mutate((db) => {
    const tx: Transaction = {
      ...input,
      id: makeId("txn"),
      reference: nextReference(),
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(tx);
    return tx;
  });
}

export async function setTransactionStatus(
  reference: string,
  status: TransactionStatus,
  patch?: { externalRef?: string; failureReason?: string; settledAt?: string },
): Promise<Transaction | undefined> {
  return mutate((db) => {
    const tx = db.transactions.find((t) => t.reference === reference);
    if (!tx) return undefined;
    tx.status = status;
    if (patch?.externalRef !== undefined) tx.externalRef = patch.externalRef;
    if (patch?.failureReason !== undefined) tx.failureReason = patch.failureReason;
    if (patch?.settledAt !== undefined) tx.settledAt = patch.settledAt;
    return tx;
  });
}

// ── Wallet ledger ──────────────────────────────────────────────
export interface WalletResult {
  ok: boolean;
  balanceAfterCents: number;
  message?: string;
}

/** Credit (or debit, if negative) a user's wallet and append a ledger entry. */
export async function adjustWallet(
  userId: string,
  deltaCents: number,
  description: string,
  transactionId?: string,
): Promise<WalletResult> {
  return mutate((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (!user) return { ok: false, balanceAfterCents: 0, message: "User not found" };
    const newBalance = user.walletBalanceCents + deltaCents;
    if (newBalance < 0) {
      return {
        ok: false,
        balanceAfterCents: user.walletBalanceCents,
        message: "Insufficient wallet balance",
      };
    }
    user.walletBalanceCents = newBalance;
    db.ledger.unshift({
      id: makeId("leg"),
      userId,
      transactionId,
      amountCents: deltaCents,
      balanceAfterCents: newBalance,
      description,
      createdAt: new Date().toISOString(),
    });
    return { ok: true, balanceAfterCents: newBalance };
  });
}

export async function getWalletBalance(userId: string): Promise<number> {
  const db = await getDb();
  return db.users.find((u) => u.id === userId)?.walletBalanceCents ?? 0;
}

export async function listLedger(userId: string) {
  const db = await getDb();
  return db.ledger
    .filter((l) => l.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Audit ──────────────────────────────────────────────────────
export async function audit(
  action: string,
  meta?: Record<string, unknown>,
  userId?: string,
  actorEmail?: string,
): Promise<void> {
  await mutate((db) => {
    db.auditLogs.unshift({
      id: makeId("aud"),
      userId,
      actorEmail,
      action,
      meta,
      createdAt: new Date().toISOString(),
    });
    if (db.auditLogs.length > 500) db.auditLogs.length = 500;
  });
}

// ── Admin aggregates ───────────────────────────────────────────
export interface AdminStats {
  totalVolumeCents: number;
  totalFeesCents: number;
  txCount: number;
  successCount: number;
  userCount: number;
  pendingCount: number;
  byCategory: Record<string, { count: number; volumeCents: number }>;
}

export async function adminStats(): Promise<AdminStats> {
  const db = await getDb();
  const stats: AdminStats = {
    totalVolumeCents: 0,
    totalFeesCents: 0,
    txCount: db.transactions.length,
    successCount: 0,
    userCount: db.users.length,
    pendingCount: 0,
    byCategory: {},
  };
  for (const t of db.transactions) {
    if (t.type === "wallet_topup") continue; // top-ups aren't outbound volume
    stats.totalVolumeCents += t.amountCents;
    stats.totalFeesCents += t.feeCents;
    if (t.status === "success") stats.successCount += 1;
    if (t.status === "pending" || t.status === "processing") stats.pendingCount += 1;
    const bucket = (stats.byCategory[t.category] ||= { count: 0, volumeCents: 0 });
    bucket.count += 1;
    bucket.volumeCents += t.amountCents;
  }
  return stats;
}

export async function allUsers(): Promise<User[]> {
  const db = await getDb();
  return [...db.users].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function dbSnapshot(): Promise<Database> {
  return getDb();
}
