import { getSessionUser } from "@/lib/auth";
import { getWalletBalance, listLedger } from "@/lib/repositories";
import { getMidRate } from "@/lib/fx";
import { formatSsp, formatUsd } from "@/lib/format";
import { WalletTopUp } from "@/components/dashboard/wallet-top-up";
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from "lucide-react";

export default async function WalletPage() {
  const session = await getSessionUser();
  if (!session) return null;
  const [balanceCents, rate, ledger] = await Promise.all([
    getWalletBalance(session.id),
    getMidRate(),
    listLedger(session.id),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Wallet</h1>
        <p className="text-sm text-slate-500">
          Fund your USD wallet, then use it to pay bills and send money.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Balance card */}
        <div className="lg:col-span-2">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-800 to-emerald-950 p-6 text-white sm:p-8">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gold-400/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <WalletIcon className="h-6 w-6 text-brand-200" />
              <span className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-medium text-brand-100">
                USD
              </span>
            </div>
            <div className="relative mt-6 text-sm text-brand-100">Available balance</div>
            <div className="relative mt-1 text-4xl font-bold tabular-nums">
              {formatUsd(balanceCents)}
            </div>
            <div className="relative mt-1 text-sm text-brand-100">
              ≈ {formatSsp((balanceCents / 100) * rate)} at mid rate
            </div>
          </div>
        </div>

        {/* Top-up */}
        <WalletTopUp currentBalanceCents={balanceCents} />
      </div>

      {/* Ledger */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">Wallet activity</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {ledger.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">
              No wallet activity yet. Top up to get started.
            </div>
          )}
          {ledger.map((l) => {
            const credit = l.amountCents >= 0;
            return (
              <div key={l.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full ${
                    credit ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {credit ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-slate-900">{l.description}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(l.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold tabular-nums ${
                    credit ? "text-emerald-700" : "text-slate-900"
                  }`}
                >
                  {credit ? "+" : ""}
                  {formatUsd(l.amountCents)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
