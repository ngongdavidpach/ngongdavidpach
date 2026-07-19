import {
  ArrowDownLeft,
  ArrowUpRight,
  GraduationCap,
  Smartphone,
  Stethoscope,
  Zap,
  Landmark,
  Receipt,
  Building2,
} from "lucide-react";
import type { Transaction } from "@/lib/types";
import { formatUsd, relativeTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";

export function categoryIcon(category: string) {
  switch (category) {
    case "school":
      return GraduationCap;
    case "hospital":
      return Stethoscope;
    case "utility":
      return Zap;
    case "mobile_money":
      return Smartphone;
    case "government":
      return Landmark;
    case "airtime":
      return Receipt;
    case "wallet":
      return Building2;
    default:
      return Receipt;
  }
}

export function TransactionRow({ tx }: { tx: Transaction }) {
  const isCredit = tx.type === "wallet_topup";
  const Icon = isCredit ? ArrowDownLeft : categoryIcon(tx.category);
  const sign = isCredit ? "+" : tx.status === "reversed" ? "" : "-";

  return (
    <div className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-slate-900">
          {tx.beneficiaryName}
        </div>
        <div className="truncate text-xs text-slate-400">
          {tx.narrative} • {relativeTime(tx.createdAt)}
        </div>
      </div>
      <div className="hidden text-right sm:block">
        <StatusBadge status={tx.status} />
      </div>
      <div className="w-24 text-right">
        <div
          className={`text-sm font-semibold tabular-nums ${
            isCredit
              ? "text-emerald-700"
              : tx.status === "reversed"
                ? "text-slate-400 line-through"
                : "text-slate-900"
          }`}
        >
          {sign}
          {formatUsd(isCredit ? tx.amountCents : tx.totalCents)}
        </div>
        <div className="text-[11px] text-slate-400">{tx.reference}</div>
      </div>
    </div>
  );
}
