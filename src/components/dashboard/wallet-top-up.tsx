"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CreditCard, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/cn";

const PRESETS = [50, 100, 250, 500, 1000];

export function WalletTopUp({ currentBalanceCents }: { currentBalanceCents: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState<number>(100);
  const [source, setSource] = useState("Visa •••• 4242");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function topUp() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/payments/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: Math.round(amount * 100), source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Top-up failed");
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card flex flex-col items-center p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          ✓
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-900">Wallet topped up</h3>
        <p className="mt-1 text-sm text-slate-500">
          {formatUsd(amount * 100)} added from {source}.
        </p>
        <Button className="mt-4 w-full" variant="secondary" onClick={() => setDone(false)}>
          Top up again
        </Button>
      </div>
    );
  }

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-brand-600" />
        <h3 className="text-base font-semibold text-slate-900">Top up wallet</h3>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      <div className="mt-4">
        <label className="label-base">Amount (USD)</label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(p)}
              className={cn(
                "rounded-lg border py-2 text-sm font-semibold transition",
                amount === p
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-slate-300 text-slate-600 hover:bg-slate-50",
              )}
            >
              ${p}
            </button>
          ))}
        </div>
        <div className="relative mt-2">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">$</span>
          <input
            type="number"
            min={5}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="input-base pl-7"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="label-base">Funding source</label>
        <div className="space-y-2">
          {["Visa •••• 4242", "Bank •••• 8821"].map((s) => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition",
                source === s ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:bg-slate-50",
              )}
            >
              <CreditCard className="h-5 w-5 text-slate-400" />
              <span className="flex-1 text-sm font-medium text-slate-800">{s}</span>
              {source === s && <span className="h-2.5 w-2.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-500">New balance after</span>
        <span className="font-bold text-slate-900 tabular-nums">
          {formatUsd(currentBalanceCents + amount * 100)}
        </span>
      </div>

      <Button className="mt-4 w-full" onClick={topUp} disabled={busy || amount < 5}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {busy ? "Processing…" : `Top up ${formatUsd(amount * 100)}`}
      </Button>
      <p className="mt-2 text-center text-xs text-slate-400">
        No fee on wallet top-ups. Card charged securely.
      </p>
    </div>
  );
}
