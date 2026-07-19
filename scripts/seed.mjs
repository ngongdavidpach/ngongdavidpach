// ─────────────────────────────────────────────────────────────
// Junub Pay — database seed.
//
// Run with: npm run seed
// Creates ./data/junubpay.json with realistic demo data:
//   • 1 admin + 1 diaspora member (with hashed passwords)
//   • Verified service providers (schools, hospitals, utilities, …)
//   • Beneficiaries and a rich transaction history so dashboards look alive.
// ─────────────────────────────────────────────────────────────

import bcrypt from "bcryptjs";
import { mkdir, writeFile, rename } from "fs/promises";
import path from "path";

const DB_PATH = process.env.JUNUB_DB_PATH || path.join(process.cwd(), "data", "junubpay.json");
const SSP_RATE = 1450;

function id(prefix) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const now = Date.now();
function iso(daysAgo, hoursAgo = 0) {
  return new Date(now - daysAgo * 86400000 - hoursAgo * 3600000).toISOString();
}

function hashSync(pw) {
  return bcrypt.hashSync(pw, 10);
}

const admin = {
  id: id("usr"),
  role: "admin",
  email: "admin@junubpay.ss",
  passwordHash: hashSync("admin123"),
  fullName: "Junub Pay Operations",
  phone: "+211920000000",
  residenceCountry: "SS",
  city: "Juba",
  kycStatus: "verified",
  walletBalanceCents: 0,
  createdAt: iso(120),
};

const member = {
  id: id("usr"),
  role: "member",
  email: "demo@junubpay.ss",
  passwordHash: hashSync("demo1234"),
  fullName: "David Akol",
  phone: "+12025550184",
  residenceCountry: "US",
  city: "Dallas, TX",
  kycStatus: "verified",
  walletBalanceCents: 245000, // $2,450.00
  createdAt: iso(90),
};

const secondMember = {
  id: id("usr"),
  role: "member",
  email: "ayak@junubpay.ss",
  passwordHash: hashSync("demo1234"),
  fullName: "Ayak Garang",
  phone: "+61400123456",
  residenceCountry: "AU",
  city: "Melbourne",
  kycStatus: "verified",
  walletBalanceCents: 87000,
  createdAt: iso(45),
};

const beneficiaries = [
  {
    id: id("ben"), userId: member.id, fullName: "Mary Akol", relationship: "Mother",
    phone: "0922123456", mobileMoneyProvider: "MTN", city: "Juba", country: "SS", createdAt: iso(80),
  },
  {
    id: id("ben"), userId: member.id, fullName: "Emmanuel Akol", relationship: "Brother",
    phone: "0912778899", mobileMoneyProvider: "ZAIN", city: "Wau", country: "SS", createdAt: iso(75),
  },
  {
    id: id("ben"), userId: member.id, fullName: "Grace Akol", relationship: "Sister",
    phone: "0922555666", mobileMoneyProvider: "MTN", city: "Juba", country: "SS", createdAt: iso(60),
  },
  {
    id: id("ben"), userId: secondMember.id, fullName: "Deng Garang", relationship: "Father",
    phone: "0914445566", mobileMoneyProvider: "ZAIN", city: "Bor", country: "SS", createdAt: iso(40),
  },
];

const providers = [
  // Schools
  { id: id("prv"), category: "school", name: "University of Juba", accountRef: "UOJ-FIN", city: "Juba", accent: "from-emerald-500 to-emerald-700", verified: true, subCategory: "University", createdAt: iso(100) },
  { id: id("prv"), category: "school", name: "St. Mary's College Juba", accountRef: "SMC-BURSAR", city: "Juba", accent: "from-teal-500 to-emerald-700", verified: true, subCategory: "Secondary", createdAt: iso(98) },
  { id: id("prv"), category: "school", name: "Dr. John Garang Memorial University", accountRef: "JGMU-ACCT", city: "Bor", accent: "from-emerald-500 to-green-700", verified: true, subCategory: "University", createdAt: iso(96) },
  { id: id("prv"), category: "school", name: "Juba Day Secondary School", accountRef: "JDS-FEES", city: "Juba", accent: "from-green-500 to-emerald-700", verified: true, subCategory: "Secondary", createdAt: iso(94) },
  { id: id("prv"), category: "school", name: "Comboni College", accountRef: "CC-FIN", city: "Juba", accent: "from-teal-500 to-green-700", verified: false, subCategory: "Secondary", createdAt: iso(30) },
  // Hospitals
  { id: id("prv"), category: "hospital", name: "Juba Teaching Hospital", accountRef: "JTH-BILLING", city: "Juba", accent: "from-rose-500 to-red-700", verified: true, subCategory: "Public", createdAt: iso(95) },
  { id: id("prv"), category: "hospital", name: "Doctors' Hospital Juba", accountRef: "DHJ-PATIENT", city: "Juba", accent: "from-red-500 to-rose-700", verified: true, subCategory: "Private", createdAt: iso(92) },
  { id: id("prv"), category: "hospital", name: "Bahr Medical Centre", accountRef: "BMC-ACCT", city: "Wau", accent: "from-pink-500 to-rose-700", verified: true, subCategory: "Private", createdAt: iso(88) },
  { id: id("prv"), category: "hospital", name: "Samaritan Health Clinic", accountRef: "SHC-BILL", city: "Yei", accent: "from-rose-500 to-pink-700", verified: false, subCategory: "Clinic", createdAt: iso(20) },
  // Utilities
  { id: id("prv"), category: "utility", name: "South Sudan Electricity Corporation", accountRef: "SSEC-METER", city: "Juba", accent: "from-amber-500 to-yellow-600", verified: true, subCategory: "Electricity", createdAt: iso(90) },
  { id: id("prv"), category: "utility", name: "National Water & Sanitation Corp.", accountRef: "NWSC-ACCT", city: "Juba", accent: "from-sky-500 to-blue-600", verified: true, subCategory: "Water", createdAt: iso(89) },
  { id: id("prv"), category: "utility", name: "Nilepet Energy", accountRef: "NILEPET", city: "Juba", accent: "from-orange-500 to-amber-600", verified: true, subCategory: "Fuel", createdAt: iso(85) },
  // Government
  { id: id("prv"), category: "government", name: "South Sudan Revenue Authority", accountRef: "SSRA-PAY", city: "Juba", accent: "from-indigo-500 to-blue-700", verified: true, subCategory: "Tax & Fees", createdAt: iso(70) },
  { id: id("prv"), category: "government", name: "Directorate of Immigration", accountRef: "DOI-PASSPORT", city: "Juba", accent: "from-violet-500 to-indigo-700", verified: true, subCategory: "Passport & IDs", createdAt: iso(68) },
  // Airtime
  { id: id("prv"), category: "airtime", name: "MTN Airtime Top-up", accountRef: "MTN-AIR", city: "Nationwide", accent: "from-yellow-400 to-amber-500", verified: true, subCategory: "Airtime", createdAt: iso(80) },
  { id: id("prv"), category: "airtime", name: "Zain Airtime Top-up", accountRef: "ZAIN-AIR", city: "Nationwide", accent: "from-purple-500 to-violet-600", verified: true, subCategory: "Airtime", createdAt: iso(79) },
];

// Build a believable transaction history for the demo member.
const txns = [];
const ledger = [];
let balance = member.walletBalanceCents;

function ref() {
  return `JP-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.random().toString(36).toUpperCase().slice(2, 5)}`;
}

function pushTxn(t) {
  txns.unshift({ id: id("txn"), reference: ref(), createdAt: t.createdAt, ...t });
}

// A few top-ups (credits)
const topup1 = { amountCents: 200000, source: "Visa •••• 4242", daysAgo: 80 };
const topup2 = { amountCents: 150000, source: "Bank •••• 8821", daysAgo: 50 };
const topup3 = { amountCents: 100000, source: "Visa •••• 4242", daysAgo: 21 };

// Bill payments + mobile money sends
const billHistory = [
  { daysAgo: 78, providerName: "University of Juba", category: "school", amountCents: 80000, customerRef: "STU-2024-1182", channel: "PROVIDER_LEDGER", ok: true },
  { daysAgo: 72, providerName: "Juba Teaching Hospital", category: "hospital", amountCents: 35000, customerRef: "PT-9921", channel: "PROVIDER_LEDGER", ok: true },
  { daysAgo: 64, providerName: "MTN MoMo", category: "mobile_money", amountCents: 20000, beneficiary: "Mary Akol", channel: "MTN_MOMO", ok: true },
  { daysAgo: 55, providerName: "South Sudan Electricity Corporation", category: "utility", amountCents: 12000, customerRef: "MTR-44821", channel: "PROVIDER_LEDGER", ok: true },
  { daysAgo: 48, providerName: "Zain Cash", category: "mobile_money", amountCents: 30000, beneficiary: "Emmanuel Akol", channel: "ZAIN_CASH", ok: true },
  { daysAgo: 40, providerName: "St. Mary's College Juba", category: "school", amountCents: 45000, customerRef: "STU-7733", channel: "PROVIDER_LEDGER", ok: true },
  { daysAgo: 33, providerName: "National Water & Sanitation Corp.", category: "utility", amountCents: 8000, customerRef: "ACCT-22119", channel: "PROVIDER_LEDGER", ok: true },
  { daysAgo: 27, providerName: "MTN MoMo", category: "mobile_money", amountCents: 25000, beneficiary: "Grace Akol", channel: "MTN_MOMO", ok: true },
  { daysAgo: 18, providerName: "Bahr Medical Centre", category: "hospital", amountCents: 18000, customerRef: "PT-3301", channel: "PROVIDER_LEDGER", ok: true },
  { daysAgo: 12, providerName: "Doctors' Hospital Juba", category: "hospital", amountCents: 52000, customerRef: "PT-5582", channel: "PROVIDER_LEDGER", ok: true },
  { daysAgo: 6, providerName: "University of Juba", category: "school", amountCents: 60000, customerRef: "STU-2024-1182", channel: "PROVIDER_LEDGER", ok: true },
  { daysAgo: 3, providerName: "MTN MoMo", category: "mobile_money", amountCents: 15000, beneficiary: "Mary Akol", channel: "MTN_MOMO", ok: true },
  { daysAgo: 1, providerName: "Nilepet Energy", category: "utility", amountCents: 22000, customerRef: "ACCT-90112", channel: "PROVIDER_LEDGER", ok: false, fail: "Nilepet billing system timeout — auto-reversed" },
];

// Top-up transactions
for (const t of [topup1, topup2, topup3]) {
  pushTxn({
    userId: member.id, type: "wallet_topup", category: "wallet",
    amountCents: t.amountCents, feeCents: 0, totalCents: t.amountCents,
    amountSsp: 0, fxRate: 0, beneficiaryName: "Junub Pay Wallet", providerName: t.source,
    channel: "WALLET", status: "success", narrative: `Wallet top-up from ${t.source}`,
    settledAt: iso(t.daysAgo), createdAt: iso(t.daysAgo, 1),
  });
}

// Outbound transactions (compute fee with the same schedule)
function feeFor(category, amountCents) {
  if (category === "mobile_money") {
    return Math.min(1800, Math.max(75, Math.round((amountCents * 290) / 10000) + 50));
  }
  return Math.min(1500, Math.max(75, Math.round((amountCents * 180) / 10000) + 50));
}

for (const b of billHistory) {
  const fee = feeFor(b.category, b.amountCents);
  const total = b.amountCents + fee;
  const fxRate = Math.round(SSP_RATE * (1 - 0.015));
  const amountSsp = Math.round((b.amountCents / 100) * fxRate);
  const type = b.category === "mobile_money" ? "mobile_money" : "bill_payment";
  const beneficiaryName = b.beneficiary || b.providerName;
  const narrative = b.customerRef
    ? `${b.providerName} • ref ${b.customerRef}`
    : `${beneficiaryName} (${b.providerName})`;
  const status = b.ok ? "success" : "reversed";
  pushTxn({
    userId: member.id, type, category: b.category,
    amountCents: b.amountCents, feeCents: fee, totalCents: total,
    amountSsp, fxRate, beneficiaryName, providerName: b.providerName,
    channel: b.channel, status,
    narrative,
    externalRef: b.ok ? `STL-${Math.random().toString(36).toUpperCase().slice(2, 8)}` : undefined,
    failureReason: b.fail,
    settledAt: b.ok ? iso(b.daysAgo, 2) : undefined,
    createdAt: iso(b.daysAgo, 2),
  });
}

// Reverse-chron ledger derived from transactions for the demo member.
for (const t of [...txns].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))) {
  if (t.userId !== member.id) continue;
  const isCredit = t.type === "wallet_topup";
  const delta = isCredit ? t.amountCents : -t.totalCents;
  if (!isCredit && t.status === "reversed") continue; // net zero
  balance += 0; // not recomputing precisely; seed balance is authoritative
  ledger.push({
    id: id("leg"), userId: member.id, transactionId: t.id,
    amountCents: delta, balanceAfterCents: 0, // display only
    description: t.narrative, createdAt: t.createdAt,
  });
}

const auditLogs = [
  { id: id("aud"), action: "system.seed", meta: { note: "Demo data initialized" }, createdAt: iso(0) },
];

const db = {
  users: [admin, member, secondMember],
  beneficiaries,
  providers,
  transactions: txns,
  ledger: ledger.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
  auditLogs,
  meta: { schemaVersion: 1, seededAt: new Date().toISOString(), sspRate: SSP_RATE },
};

await mkdir(path.dirname(DB_PATH), { recursive: true });
const tmp = `${DB_PATH}.tmp`;
await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
await rename(tmp, DB_PATH);

console.log("✓ Junub Pay database seeded at", DB_PATH);
console.log("  • Users:", db.users.length, "(admin: admin@junubpay.ss / admin123)");
console.log("  • Members:", db.users.filter((u) => u.role === "member").length, "(demo: demo@junubpay.ss / demo1234)");
console.log("  • Providers:", db.providers.length);
console.log("  • Beneficiaries:", db.beneficiaries.length);
console.log("  • Transactions:", db.transactions.length);
