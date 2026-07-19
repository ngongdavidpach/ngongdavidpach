import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listUserTransactions } from "@/lib/repositories";
import { TransactionRow } from "@/components/dashboard/transaction-row";
import { StatusBadge } from "@/components/ui/badge";
import { formatSsp, formatUsd } from "@/lib/format";
import { Receipt } from "lucide-react";

const STATUS_FILTERS = [
  { key: "all", label: "All" },
  { key: "success", label: "Successful" },
  { key: "processing", label: "Processing" },
  { key: "reversed", label: "Reversed" },
];

const TYPE_FILTERS = [
  { key: "all", label: "All types" },
  { key: "bill_payment", label: "Bill payments" },
  { key: "mobile_money", label: "Mobile money" },
  { key: "wallet_topup", label: "Top-ups" },
];

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string };
}) {
  const session = await getSessionUser();
  if (!session) return null;
  let txns = await listUserTransactions(session.id);

  const status = searchParams.status && searchParams.status !== "all" ? searchParams.status : null;
  const type = searchParams.type && searchParams.type !== "all" ? searchParams.type : null;

  if (status) txns = txns.filter((t) => t.status === status);
  if (type) txns = txns.filter((t) => t.type === type);

  const totalVolume = txns
    .filter((t) => t.type !== "wallet_topup" && t.status === "success")
    .reduce((s, t) => s + t.amountCents, 0);
  const totalFees = txns
    .filter((t) => t.type !== "wallet_topup" && t.status === "success")
    .reduce((s, t) => s + t.feeCents, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Transactions</h1>
          <p className="text-sm text-slate-500">Every payment you&rsquo;ve made through Junub Pay.</p>
        </div>
        <Link
          href="/dashboard/send"
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          New payment
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Summary label="Transactions" value={String(txns.length)} />
        <Summary label="Volume sent" value={formatUsd(totalVolume)} />
        <Summary label="Fees paid" value={formatUsd(totalFees)} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Status"
          options={STATUS_FILTERS}
          active={status || "all"}
          paramName="status"
          otherParams={{ type: type || "all" }}
        />
        <FilterGroup
          label="Type"
          options={TYPE_FILTERS}
          active={type || "all"}
          paramName="type"
          otherParams={{ status: status || "all" }}
        />
      </div>

      {/* Table (desktop) */}
      <div className="card hidden overflow-hidden lg:block">
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-semibold">Reference</th>
                <th className="px-6 py-3 font-semibold">Recipient / Provider</th>
                <th className="px-6 py-3 font-semibold">Channel</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Fee</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {txns.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-3.5 font-mono text-xs text-slate-500">{t.reference}</td>
                  <td className="px-6 py-3.5">
                    <div className="font-medium text-slate-900">{t.beneficiaryName}</div>
                    <div className="text-xs text-slate-400">{t.narrative}</div>
                  </td>
                  <td className="px-6 py-3.5 text-slate-600">{t.providerName}</td>
                  <td className="px-6 py-3.5">
                    <div className="font-semibold text-slate-900 tabular-nums">
                      {t.type === "wallet_topup" ? "+" : "-"}
                      {formatUsd(t.type === "wallet_topup" ? t.amountCents : t.totalCents)}
                    </div>
                    {t.amountSsp > 0 && (
                      <div className="text-xs text-slate-400">{formatSsp(t.amountSsp)}</div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 tabular-nums text-slate-600">
                    {t.feeCents > 0 ? formatUsd(t.feeCents) : "—"}
                  </td>
                  <td className="px-6 py-3.5"><StatusBadge status={t.status} /></td>
                  <td className="px-6 py-3.5 text-slate-500">
                    {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {txns.length === 0 && (
          <div className="py-16 text-center">
            <Receipt className="mx-auto h-10 w-10 text-slate-200" />
            <p className="mt-3 text-sm text-slate-400">No transactions match these filters.</p>
          </div>
        )}
      </div>

      {/* List (mobile) */}
      <div className="card divide-y divide-slate-100 lg:hidden">
        {txns.map((t) => (
          <TransactionRow key={t.id} tx={t} />
        ))}
        {txns.length === 0 && (
          <div className="py-16 text-center">
            <Receipt className="mx-auto h-10 w-10 text-slate-200" />
            <p className="mt-3 text-sm text-slate-400">No transactions yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  active,
  paramName,
  otherParams,
}: {
  label: string;
  options: { key: string; label: string }[];
  active: string;
  paramName: string;
  otherParams: Record<string, string>;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
      <span className="px-2 text-xs font-medium text-slate-400">{label}</span>
      {options.map((o) => {
        const isActive = active === o.key;
        const params = new URLSearchParams({
          ...otherParams,
          [paramName]: o.key,
        });
        return (
          <Link
            key={o.key}
            href={`/dashboard/transactions?${params.toString()}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isActive ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}
