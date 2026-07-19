import Link from "next/link";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  GraduationCap,
  Plus,
  Send,
  Smartphone,
  Stethoscope,
  Zap,
} from "lucide-react";
import {
  getWalletBalance,
  listBeneficiaries,
  listUserTransactions,
} from "@/lib/repositories";
import { getMidRate } from "@/lib/fx";
import { formatSsp, formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { TransactionRow } from "@/components/dashboard/transaction-row";

export default async function OverviewPage() {
  // user id is available via the layout session; fetch via header? We need it here.
  // We re-derive the session in this server component.
  const { getSessionUser } = await import("@/lib/auth");
  const session = await getSessionUser();
  if (!session) return null;
  const userId = session.id;

  const [balanceCents, rate, transactions, beneficiaries] = await Promise.all([
    getWalletBalance(userId),
    getMidRate(),
    listUserTransactions(userId),
    listBeneficiaries(userId),
  ]);

  // 30-day outbound stats
  const cutoff = Date.now() - 30 * 86400000;
  const outbound = transactions.filter(
    (t) => t.type !== "wallet_topup" && new Date(t.createdAt).getTime() > cutoff,
  );
  const sentCents = outbound
    .filter((t) => t.status === "success")
    .reduce((s, t) => s + t.amountCents, 0);
  const feesCents = outbound
    .filter((t) => t.status === "success")
    .reduce((s, t) => s + t.feeCents, 0);

  // 6-month volume buckets for the sparkline
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - (5 - i));
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString("en-US", { month: "short" }) };
  });
  const buckets = months.map((m) => {
    const vol = transactions
      .filter((t) => t.type !== "wallet_topup" && t.status === "success")
      .filter((t) => {
        const d = new Date(t.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}` === m.key;
      })
      .reduce((s, t) => s + t.amountCents, 0);
    return { ...m, vol };
  });
  const maxBucket = Math.max(1, ...buckets.map((b) => b.vol));

  const firstName = session.fullName.split(" ")[0];
  const recent = transactions.slice(0, 6);

  const quickActions = [
    { href: "/dashboard/send?tab=bill&category=school", label: "School fees", icon: GraduationCap, tone: "from-emerald-500 to-emerald-700" },
    { href: "/dashboard/send?tab=bill&category=hospital", label: "Medical bills", icon: Stethoscope, tone: "from-rose-500 to-red-700" },
    { href: "/dashboard/send?tab=bill&category=utility", label: "Utilities", icon: Zap, tone: "from-amber-500 to-yellow-600" },
    { href: "/dashboard/send?tab=momo", label: "Send money", icon: Smartphone, tone: "from-blue-500 to-indigo-600" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Karibu, {firstName} 👋
        </h1>
        <p className="text-sm text-slate-500">
          Here&rsquo;s what&rsquo;s happening with your remittances to South Sudan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Wallet hero */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-800 to-emerald-950 p-6 text-white sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold-400/10 blur-2xl" />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="text-sm text-brand-100">Wallet balance</div>
                <div className="mt-1 text-4xl font-bold tabular-nums">
                  {formatUsd(balanceCents)}
                </div>
                <div className="mt-1 text-sm text-brand-100">
                  ≈ {formatSsp(balanceCents / 100 * rate)} at mid rate
                </div>
              </div>
              <div className="rounded-xl bg-white/10 px-3 py-1.5 text-xs font-medium text-brand-100">
                USD wallet
              </div>
            </div>
            <div className="relative mt-6 flex flex-wrap gap-3">
              <Link href="/dashboard/wallet">
                <Button variant="gold" size="sm">
                  <Plus className="h-4 w-4" /> Top up
                </Button>
              </Link>
              <Link href="/dashboard/send">
                <Button size="sm" className="bg-white/15 text-white hover:bg-white/25">
                  <Send className="h-4 w-4" /> Send / Pay a bill
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats column */}
        <div className="space-y-4">
          <StatCard
            label="Sent (30 days)"
            value={formatUsd(sentCents)}
            icon={<ArrowUpRight className="h-5 w-5" />}
            tone="text-emerald-700 bg-emerald-50"
          />
          <StatCard
            label="Fees paid (30 days)"
            value={formatUsd(feesCents)}
            icon={<ArrowDownLeft className="h-5 w-5" />}
            tone="text-gold-700 bg-gold-50"
            sub={
              sentCents > 0
                ? `${((feesCents / sentCents) * 100).toFixed(1)}% effective`
                : undefined
            }
          />
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {quickActions.map(({ href, label, icon: Icon, tone }) => (
          <Link
            key={label}
            href={href}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
          >
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white`}>
              <Icon className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">{label}</div>
              <div className="text-xs text-slate-400">Pay now</div>
            </div>
            <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent transactions */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between p-5 sm:p-6">
              <h3 className="text-base font-semibold text-slate-900">Recent transactions</h3>
              <Link href="/dashboard/transactions" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                View all
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {recent.length === 0 && (
                <div className="p-6 text-center text-sm text-slate-400">
                  No transactions yet. Send your first payment!
                </div>
              )}
              {recent.map((t) => (
                <TransactionRow key={t.id} tx={t} />
              ))}
            </div>
          </div>
        </div>

        {/* Volume chart + beneficiaries */}
        <div className="space-y-6">
          <div className="card p-5 sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Last 6 months</h3>
            <p className="text-sm text-slate-400">Outbound volume sent home</p>
            <div className="mt-6 flex h-32 items-end justify-between gap-2">
              {buckets.map((b) => (
                <div key={b.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
                      style={{ height: `${Math.max(4, (b.vol / maxBucket) * 100)}%` }}
                      title={formatUsd(b.vol)}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Beneficiaries</h3>
              <Link href="/dashboard/beneficiaries" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                Manage
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {beneficiaries.slice(0, 3).map((b) => (
                <div key={b.id} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {b.fullName.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{b.fullName}</div>
                    <div className="text-xs text-slate-400">{b.relationship} • {b.city}</div>
                  </div>
                  <span className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${b.mobileMoneyProvider === "MTN" ? "bg-yellow-100 text-yellow-800" : "bg-violet-100 text-violet-700"}`}>
                    {b.mobileMoneyProvider}
                  </span>
                </div>
              ))}
              {beneficiaries.length === 0 && (
                <p className="text-sm text-slate-400">No beneficiaries yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
  sub?: string;
}) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}>
        {icon}
      </span>
      <div>
        <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
        <div className="text-xl font-bold text-slate-900 tabular-nums">{value}</div>
        {sub && <div className="text-xs text-slate-400">{sub}</div>}
      </div>
    </div>
  );
}
