"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Loader2 } from "lucide-react";
import { formatSsp } from "@/lib/format";

export function FxRateControl({ rate }: { rate: number }) {
  const router = useRouter();
  const [value, setValue] = useState(String(rate));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      setBusy(false);
      return;
    }
    const res = await fetch("/api/admin/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate: Math.round(n) }),
    });
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
    setBusy(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-brand-600" />
        <h3 className="text-base font-semibold text-slate-900">USD → SSP rate</h3>
      </div>
      <p className="mt-1 text-sm text-slate-400">
        Mid-market rate shown to senders. Disbursements apply a 1.5% spread.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">1 USD =</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-[68px] pr-16 text-sm font-semibold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">SSP</span>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex h-[42px] items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? "Saved ✓" : "Update"}
        </button>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        $100 → {formatSsp(100 * rate)} • disburse {formatSsp(Math.round(100 * rate * 0.985))}
      </div>
    </div>
  );
}
