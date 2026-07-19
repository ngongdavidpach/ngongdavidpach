"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  COMPETITORS,
  competitorCost,
  quoteFee,
  savingsVsMarket,
} from "@/lib/fees";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

const PRESETS = [100, 300, 1000, 2500];

export function SavingsCalculator() {
  const [amount, setAmount] = useState(500);
  const amountCents = Math.round(amount * 100);
  const quote = useMemo(() => quoteFee("bill", amountCents), [amountCents]);
  const savings = useMemo(
    () => savingsVsMarket("bill", amountCents),
    [amountCents],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      {/* Input side */}
      <div className="card p-6 sm:p-8">
        <label className="label-base">Send amount (USD)</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-semibold text-slate-400">
            $
          </span>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full rounded-xl border border-slate-300 bg-white py-4 pl-10 pr-4 text-2xl font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition",
                amount === p
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50",
              )}
            >
              ${p.toLocaleString()}
            </button>
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <Row label="Junub Pay fee" value={formatUsd(quote.feeCents)} highlight />
          <Row
            label="Recipient receives (SSP ≈)"
            value={`SSP ${Math.round(amount * 1428).toLocaleString()}`}
          />
          <Row
            label="You pay"
            value={formatUsd(quote.totalCents)}
            strong
          />
        </div>

        <div className="mt-6 rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white">
          <div className="text-sm text-brand-100">You save vs. traditional transfer</div>
          <div className="mt-1 text-3xl font-bold">
            {formatUsd(savings.savingsCents)}
          </div>
          <div className="mt-1 text-sm text-brand-100">
            ≈ {savings.savingsPct}% lower fees than the market average
          </div>
        </div>
      </div>

      {/* Comparison side */}
      <div className="card overflow-hidden p-6 sm:p-8">
        <h4 className="text-base font-semibold text-slate-900">
          What it costs elsewhere
        </h4>
        <p className="mt-1 text-sm text-slate-500">
          All-in cost on the USD → South Sudan corridor (fees + FX margin).
        </p>
        <ul className="mt-5 space-y-3">
          {COMPETITORS.map((c) => {
            const cost = competitorCost(c, amountCents);
            return (
              <li
                key={c.name}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-400">{c.note}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatUsd(cost)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {((cost / Math.max(amountCents, 1)) * 100).toFixed(1)}%
                  </div>
                </div>
              </li>
            );
          })}
          <li className="flex items-center justify-between rounded-xl border-2 border-brand-600 bg-brand-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              <div className="text-sm font-semibold text-brand-800">
                Junub Pay (bill pay)
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold text-brand-800">
                {formatUsd(quote.feeCents)}
              </div>
              <div className="text-xs text-brand-600">
                {quote.effectiveRatePct.toFixed(1)}%
              </div>
            </div>
          </li>
        </ul>
        <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
          Pay less, send more <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
  strong,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-sm", strong ? "font-semibold text-slate-900" : "text-slate-500")}>
        {label}
      </span>
      <span
        className={cn(
          "text-sm tabular-nums",
          strong ? "text-lg font-bold text-slate-900" : highlight ? "font-semibold text-brand-700" : "font-medium text-slate-800",
        )}
      >
        {value}
      </span>
    </div>
  );
}
