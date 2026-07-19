import Link from "next/link";
import { adminStats, allUsers, listAllTransactions, listProviders } from "@/lib/repositories";
import { getMidRate } from "@/lib/fx";
import { formatSsp, formatUsd } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";
import { FxRateControl } from "@/components/admin/fx-rate-control";
import { Building2, DollarSign, TrendingUp, Users } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  school: "School fees",
  hospital: "Medical",
  utility: "Utilities",
  mobile_money: "Mobile money",
  government: "Government",
  airtime: "Airtime",
  wallet: "Wallet",
};

export default async function AdminOverviewPage() {
  const [stats, rate, transactions, users, providers] = await Promise.all([
    adminStats(),
    getMidRate(),
    listAllTransactions(),
    allUsers(),
    listProviders(),
  ]);

  // Last 8 weeks outbound volume
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = Date.now() - (7 - i) * 7 * 86400000;
    const end = start + 7 * 86400000;
    const vol = transactions
      .filter((t) => t.type !== "wallet_topup" && t.status === "success")
      .filter((t) => {
        const ts = new Date(t.createdAt).getTime();
        return ts >= start && ts < end;
      })
      .reduce((s, t) => s + t.amountCents, 0);
    return { label: `W${i + 1}`, vol };
  });
  const maxWeek = Math.max(1, ...weeks.map((w) => w.vol));

  const recent = transactions.slice(0, 8);

  const statCards = [
    {
      label: "Outbound volume",
      value: formatUsd(stats.totalVolumeCents),
      icon: <DollarSign className="h-5 w-5" />,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Fees earned",
      value: formatUsd(stats.totalFeesCents),
      icon: <TrendingUp className="h-5 w-5" />,
      tone: "bg-gold-50 text-gold-700",
    },
    {
      label: "Active members",
      value: String(users.filter((u) => u.role === "member").length),
      icon: <Users className="h-5 w-5" />,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Verified providers",
      value: String(providers.filter((p) => p.verified).length),
      icon: <Building2 className="h-5 w-5" />,
      tone: "bg-violet-50 text-violet-700",
    },
  ];

  const successRate =
    stats.txCount > 0
      ? Math.round((stats.successCount / Math.max(1, stats.txCount - stats.pendingCount)) * 100)
      : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Operations overview
        </h1>
        <p className="text-sm text-slate-500">
          USD → South Sudan corridor performance at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.tone}`}>
              {s.icon}
            </span>
            <div className="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{s.value}</div>
            <div className="text-xs uppercase tracking-wide text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Volume chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card lg:col-span-2 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Outbound volume</h3>
              <p className="text-sm text-slate-400">Last 8 weeks • all providers</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">Success rate</div>
              <div className="text-lg font-bold text-emerald-600">{successRate}%</div>
            </div>
          </div>
          <div className="mt-6 flex h-44 items-end gap-3">
            {weeks.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-2">
                <div className="text-[10px] text-slate-400">{w.vol > 0 ? formatUsd(w.vol).replace(".00", "") : ""}</div>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-brand-700 to-brand-400"
                    style={{ height: `${Math.max(3, (w.vol / maxWeek) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{w.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FX control + category mix */}
        <div className="space-y-6">
          <FxRateControl rate={rate} />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
            <h3 className="text-base font-semibold text-slate-900">Volume by category</h3>
            <div className="mt-4 space-y-3">
              {Object.entries(stats.byCategory)
                .sort((a, b) => b[1].volumeCents - a[1].volumeCents)
                .map(([cat, v]) => {
                  const pct = stats.totalVolumeCents > 0 ? (v.volumeCents / stats.totalVolumeCents) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{CATEGORY_LABELS[cat] || cat}</span>
                        <span className="font-semibold text-slate-900">{formatUsd(v.volumeCents)}</span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              {Object.keys(stats.byCategory).length === 0 && (
                <p className="text-sm text-slate-400">No outbound volume yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card">
        <div className="flex items-center justify-between p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Recent transactions</h3>
          <Link href="/admin/transactions" className="text-sm font-medium text-brand-700 hover:text-brand-800">
            View all
          </Link>
        </div>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-semibold">Reference</th>
                <th className="px-6 py-3 font-semibold">Member</th>
                <th className="px-6 py-3 font-semibold">Recipient</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Fee</th>
                <th className="px-6 py-3 font-semibold">SSP</th>
                <th className="px-6 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((t) => {
                const member = users.find((u) => u.id === t.userId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{t.reference}</td>
                    <td className="px-6 py-3 text-slate-700">{member?.fullName || "—"}</td>
                    <td className="px-6 py-3 text-slate-900">{t.beneficiaryName}</td>
                    <td className="px-6 py-3 font-semibold tabular-nums">{formatUsd(t.amountCents)}</td>
                    <td className="px-6 py-3 tabular-nums text-slate-500">{formatUsd(t.feeCents)}</td>
                    <td className="px-6 py-3 tabular-nums text-slate-500">{formatSsp(t.amountSsp)}</td>
                    <td className="px-6 py-3"><StatusBadge status={t.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
