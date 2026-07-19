"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  GraduationCap,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Smartphone,
  Stethoscope,
  UserPlus,
  Zap,
} from "lucide-react";
import type { Beneficiary, ServiceProvider, Transaction } from "@/lib/types";
import { quoteFee } from "@/lib/fees";
import {
  centsToDollars,
  formatSsp,
  formatUsd,
  parseDollars,
} from "@/lib/format";
import { customerRefLabel } from "@/lib/providers/labels";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Tab = "bill" | "momo";

interface Props {
  initialTab: Tab;
  initialCategory: string;
  balanceCents: number;
  rate: number;
  payerName: string;
}

const CATEGORIES = [
  { key: "school", label: "School fees", icon: GraduationCap, tone: "from-emerald-500 to-emerald-700" },
  { key: "hospital", label: "Medical", icon: Stethoscope, tone: "from-rose-500 to-red-700" },
  { key: "utility", label: "Utilities", icon: Zap, tone: "from-amber-500 to-yellow-600" },
  { key: "government", label: "Government", icon: Landmark, tone: "from-violet-500 to-indigo-700" },
  { key: "airtime", label: "Airtime", icon: Receipt, tone: "from-purple-500 to-violet-600" },
];

export function SendFlow({
  initialTab,
  initialCategory,
  balanceCents,
  rate,
  payerName,
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const router = useRouter();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Send / Pay</h1>
        <p className="text-sm text-slate-500">
          Pay a bill directly to a provider, or send money to a family wallet.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          onClick={() => setTab("bill")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition",
            tab === "bill" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50",
          )}
        >
          Pay a bill
        </button>
        <button
          onClick={() => setTab("momo")}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-semibold transition",
            tab === "momo" ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50",
          )}
        >
          Send money
        </button>
      </div>

      {tab === "bill" ? (
        <BillFlow
          initialCategory={initialCategory}
          balanceCents={balanceCents}
          rate={rate}
          payerName={payerName}
          onDone={() => router.push("/dashboard/transactions")}
          onWallet={() => router.push("/dashboard/wallet")}
        />
      ) : (
        <MomoFlow
          balanceCents={balanceCents}
          rate={rate}
          payerName={payerName}
          onDone={() => router.push("/dashboard/transactions")}
          onWallet={() => router.push("/dashboard/wallet")}
        />
      )}
    </div>
  );
}

// ── Bill pay flow ───────────────────────────────────────────────
type BillStep = "category" | "provider" | "details" | "review" | "done";

function BillFlow({
  initialCategory,
  balanceCents,
  rate,
  payerName,
  onDone,
  onWallet,
}: {
  initialCategory: string;
  balanceCents: number;
  rate: number;
  payerName: string;
  onDone: () => void;
  onWallet: () => void;
}) {
  const [step, setStep] = useState<BillStep>(
    initialCategory ? "provider" : "category",
  );
  const [category, setCategory] = useState(initialCategory || "");
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [customerRef, setCustomerRef] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);

  const provider = providers.find((p) => p.id === providerId);

  async function loadProviders(cat: string) {
    setLoadingProviders(true);
    const res = await fetch(`/api/providers?category=${cat}`);
    const data = await res.json();
    setProviders(data.providers || []);
    setLoadingProviders(false);
  }

  useEffect(() => {
    if (category) loadProviders(category);
  }, [category]);

  const amountCents = Math.round(parseDollars(amount) * 100);
  const quote = useMemo(() => quoteFee("bill", amountCents), [amountCents]);
  const ssp = Math.round((amountCents / 100) * rate);
  const insufficient = balanceCents < quote.totalCents;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, customerRef, amountCents }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Payment failed");
      setResult(data.transaction);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done" && result) {
    return (
      <SuccessReceipt
        tx={result}
        title="Bill payment settled"
        subtitle="The provider has been credited and a receipt is ready to share."
        onAnother={() => {
          setResult(null);
          setCategory("");
          setProviderId("");
          setCustomerRef("");
          setAmount("");
          setStep("category");
        }}
        onView={onDone}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Stepper
        steps={["Category", "Provider", "Details", "Review"]}
        current={
          step === "category" ? 0 : step === "provider" ? 1 : step === "details" ? 2 : 3
        }
      />

      {error && (
        <ErrorBanner message={error} onClose={() => setError(null)} />
      )}

      {step === "category" && (
        <div className="card p-5 sm:p-6">
          <h3 className="text-base font-semibold text-slate-900">What are you paying?</h3>
          <p className="mt-1 text-sm text-slate-500">Choose a category to see verified providers.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {CATEGORIES.map(({ key, label, icon: Icon, tone }) => (
              <button
                key={key}
                onClick={() => {
                  setCategory(key);
                  setStep("provider");
                }}
                className="flex flex-col items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card-hover"
              >
                <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white", tone)}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-semibold text-slate-900">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "provider" && (
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Select a provider
            </h3>
            <BackLink onClick={() => setStep("category")} />
          </div>
          {loadingProviders ? (
            <div className="py-10 text-center text-sm text-slate-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Loading providers…
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setProviderId(p.id);
                    setStep("details");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <span className={cn("flex h-11 w-11 flex-none items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white", p.accent)}>
                    {p.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900">{p.name}</span>
                      {p.verified && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          <Check className="h-2.5 w-2.5" /> Verified
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {p.subCategory ? `${p.subCategory} • ` : ""}{p.city} • {p.accountRef}
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-300" />
                </button>
              ))}
              {providers.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  No providers in this category yet.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {step === "details" && provider && (
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Payment details</h3>
            <BackLink onClick={() => setStep("provider")} />
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-sm font-bold text-white", provider.accent)}>
              {provider.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">{provider.name}</div>
              <div className="text-xs text-slate-400">{provider.city} • {provider.accountRef}</div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-base" htmlFor="ref">
                {customerRefLabel(provider.category)}
              </label>
              <input
                id="ref"
                value={customerRef}
                onChange={(e) => setCustomerRef(e.target.value)}
                className="input-base"
                placeholder="e.g. STU-2024-1182"
              />
            </div>
            <div>
              <label className="label-base" htmlFor="amt">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  id="amt"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="input-base pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {amountCents > 0 && (
            <QuotePreview
              quote={quote}
              ssp={ssp}
              insufficient={insufficient}
              onWallet={onWallet}
            />
          )}

          <div className="mt-5 flex justify-end">
            <Button
              disabled={!customerRef.trim() || amountCents < 100}
              onClick={() => setStep("review")}
            >
              Review payment <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "review" && provider && (
        <ReviewCard
          title="Confirm bill payment"
          rows={[
            ["Provider", provider.name],
            ["Reference", `${customerRefLabel(provider.category)}: ${customerRef}`],
            ["Amount", formatUsd(quote.amountCents)],
            ["Junub Pay fee", formatUsd(quote.feeCents)],
            ["Recipient gets", formatSsp(ssp)],
          ]}
          total={formatUsd(quote.totalCents)}
          balanceCents={balanceCents}
          balanceAfterCents={balanceCents - quote.totalCents}
          submitting={submitting}
          onBack={() => setStep("details")}
          onConfirm={submit}
        />
      )}
    </div>
  );
}

// ── Mobile money send flow ──────────────────────────────────────
type MomStep = "beneficiary" | "details" | "review" | "done";

function MomoFlow({
  balanceCents,
  rate,
  payerName,
  onDone,
  onWallet,
}: {
  balanceCents: number;
  rate: number;
  payerName: string;
  onDone: () => void;
  onWallet: () => void;
}) {
  const [step, setStep] = useState<MomStep>("beneficiary");
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [beneficiaryId, setBeneficiaryId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Transaction | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/beneficiaries");
    const data = await res.json();
    setBeneficiaries(data.beneficiaries || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const beneficiary = beneficiaries.find((b) => b.id === beneficiaryId);
  const amountCents = Math.round(parseDollars(amount) * 100);
  const quote = useMemo(() => quoteFee("mobile_money", amountCents), [amountCents]);
  const ssp = Math.round((amountCents / 100) * rate);
  const insufficient = balanceCents < quote.totalCents;

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/mobile-money", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beneficiaryId, amountCents, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Send failed");
      setResult(data.transaction);
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done" && result) {
    return (
      <SuccessReceipt
        tx={result}
        title="Money sent"
        subtitle="The funds have been disbursed to your beneficiary's mobile money wallet."
        onAnother={() => {
          setResult(null);
          setBeneficiaryId("");
          setAmount("");
          setNote("");
          setStep("beneficiary");
        }}
        onView={onDone}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Stepper
        steps={["Beneficiary", "Amount", "Review"]}
        current={step === "beneficiary" ? 0 : step === "details" ? 1 : 2}
      />

      {error && <ErrorBanner message={error} onClose={() => setError(null)} />}

      {step === "beneficiary" && (
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Send to</h3>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              <UserPlus className="h-4 w-4" /> Add new
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Loading beneficiaries…
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {beneficiaries.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBeneficiaryId(b.id);
                    setStep("details");
                  }}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3.5 text-left transition hover:border-brand-300 hover:bg-brand-50/40"
                >
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {b.fullName.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-slate-900">{b.fullName}</div>
                    <div className="text-xs text-slate-400">{b.relationship} • {b.city} • {b.phone}</div>
                  </div>
                  <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", b.mobileMoneyProvider === "MTN" ? "bg-yellow-100 text-yellow-800" : "bg-violet-100 text-violet-700")}>
                    {b.mobileMoneyProvider === "MTN" ? "MTN MoMo" : "Zain Cash"}
                  </span>
                </button>
              ))}
              {beneficiaries.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <p className="text-sm text-slate-500">No beneficiaries yet.</p>
                  <Button className="mt-3" variant="secondary" onClick={() => setShowAdd(true)}>
                    <Plus className="h-4 w-4" /> Add your first beneficiary
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === "details" && beneficiary && (
        <div className="card p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">How much?</h3>
            <BackLink onClick={() => setStep("beneficiary")} />
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
              {beneficiary.fullName.charAt(0)}
            </span>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">{beneficiary.fullName}</div>
              <div className="text-xs text-slate-400">
                {beneficiary.mobileMoneyProvider === "MTN" ? "MTN MoMo" : "Zain Cash"} • {beneficiary.phone}
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label-base" htmlFor="mamt">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input
                  id="mamt"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  className="input-base pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className="label-base" htmlFor="note">Note (optional)</label>
              <input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="input-base"
                placeholder="e.g. Monthly support"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {[50, 100, 250, 500].map((p) => (
              <button
                key={p}
                onClick={() => setAmount(String(p))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                ${p}
              </button>
            ))}
          </div>

          {amountCents > 0 && (
            <QuotePreview
              quote={quote}
              ssp={ssp}
              insufficient={insufficient}
              onWallet={onWallet}
            />
          )}

          <div className="mt-5 flex justify-end">
            <Button
              disabled={amountCents < 100}
              onClick={() => setStep("review")}
            >
              Review send <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "review" && beneficiary && (
        <ReviewCard
          title="Confirm mobile money send"
          rows={[
            ["Beneficiary", beneficiary.fullName],
            ["Wallet", `${beneficiary.mobileMoneyProvider === "MTN" ? "MTN MoMo" : "Zain Cash"} • ${beneficiary.phone}`],
            ["Amount", formatUsd(quote.amountCents)],
            ["Junub Pay fee", formatUsd(quote.feeCents)],
            ["Recipient gets", formatSsp(ssp)],
            ...(note ? [["Note", note] as [string, string]] : []),
          ]}
          total={formatUsd(quote.totalCents)}
          balanceCents={balanceCents}
          balanceAfterCents={balanceCents - quote.totalCents}
          submitting={submitting}
          onBack={() => setStep("details")}
          onConfirm={submit}
        />
      )}

      {showAdd && (
        <AddBeneficiaryModal
          onClose={() => setShowAdd(false)}
          onAdded={(b) => {
            setBeneficiaries((prev) => [b, ...prev]);
            setBeneficiaryId(b.id);
            setShowAdd(false);
            setStep("details");
          }}
        />
      )}
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────────
function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 flex-none items-center justify-center rounded-full text-xs font-bold",
                done
                  ? "bg-brand-600 text-white"
                  : active
                    ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500/30"
                    : "bg-slate-100 text-slate-400",
              )}
            >
              {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm font-medium sm:block",
                active ? "text-slate-900" : done ? "text-slate-500" : "text-slate-400",
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className="mx-1 hidden h-px flex-1 bg-slate-200 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
    >
      <ArrowLeft className="h-4 w-4" /> Back
    </button>
  );
}

function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="text-red-400 hover:text-red-600">✕</button>
    </div>
  );
}

function QuotePreview({
  quote,
  ssp,
  insufficient,
  onWallet,
}: {
  quote: ReturnType<typeof quoteFee>;
  ssp: number;
  insufficient: boolean;
  onWallet: () => void;
}) {
  return (
    <div className="mt-5 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Junub Pay fee ({quote.effectiveRatePct.toFixed(1)}%)</span>
        <span className="font-semibold text-slate-900">{formatUsd(quote.feeCents)}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">Recipient receives</span>
        <span className="font-semibold text-slate-900">{formatSsp(ssp)}</span>
      </div>
      <div className="flex items-center justify-between border-t border-slate-200 pt-2.5">
        <span className="text-sm font-semibold text-slate-900">Total you pay</span>
        <span className="text-lg font-bold text-slate-900 tabular-nums">
          {formatUsd(quote.totalCents)}
        </span>
      </div>
      {insufficient && (
        <button
          onClick={onWallet}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold-100 px-3 py-2 text-sm font-medium text-gold-800 hover:bg-gold-200"
        >
          <AlertCircle className="h-4 w-4" />
          Insufficient balance — top up your wallet
        </button>
      )}
    </div>
  );
}

function ReviewCard({
  title,
  rows,
  total,
  balanceCents,
  balanceAfterCents,
  submitting,
  onBack,
  onConfirm,
}: {
  title: string;
  rows: [string, string][];
  total: string;
  balanceCents: number;
  balanceAfterCents: number;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const insufficient = balanceAfterCents < 0;
  return (
    <div className="card overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="p-5 sm:p-6">
        <dl className="space-y-3">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-start justify-between gap-4">
              <dt className="text-sm text-slate-500">{k}</dt>
              <dd className="text-right text-sm font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 rounded-xl bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white">
          <div className="text-sm text-brand-100">Total charged</div>
          <div className="text-3xl font-bold tabular-nums">{total}</div>
          {!insufficient && (
            <div className="mt-1 text-sm text-brand-100">
              Wallet balance after: {formatUsd(balanceAfterCents)}
            </div>
          )}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="secondary" onClick={onBack} disabled={submitting}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <Button onClick={onConfirm} disabled={submitting || insufficient} className="min-w-40">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Processing…" : "Confirm & pay"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SuccessReceipt({
  tx,
  title,
  subtitle,
  onAnother,
  onView,
}: {
  tx: Transaction;
  title: string;
  subtitle: string;
  onAnother: () => void;
  onView: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-col items-center border-b border-slate-100 bg-gradient-to-br from-emerald-50 to-white px-6 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <h3 className="mt-4 text-xl font-bold text-slate-900">{title}</h3>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{subtitle}</p>
      </div>
      <div className="p-5 sm:p-6">
        <div className="rounded-xl border border-slate-200 p-4">
          <Row label="Reference" value={tx.reference} />
          <Row label="Recipient" value={tx.beneficiaryName} />
          <Row label="Amount" value={`${formatUsd(tx.amountCents)} • ${formatSsp(tx.amountSsp)}`} />
          <Row label="Fee" value={formatUsd(tx.feeCents)} />
          {tx.externalRef && <Row label="Settlement ref" value={tx.externalRef} />}
          <Row label="Channel" value={tx.providerName} />
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="flex-1" onClick={onAnother}>
            Pay another
          </Button>
          <Button className="flex-1" onClick={onView}>
            View transactions
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function AddBeneficiaryModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (b: Beneficiary) => void;
}) {
  const [form, setForm] = useState({
    fullName: "",
    relationship: "",
    phone: "",
    mobileMoneyProvider: "MTN" as "MTN" | "ZAIN",
    city: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/beneficiaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Could not add beneficiary");
      onAdded(data.beneficiary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add beneficiary");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Add beneficiary</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}
        <div className="mt-4 space-y-3">
          <div>
            <label className="label-base">Full name</label>
            <input className="input-base" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Mary Akol" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-base">Relationship</label>
              <input className="input-base" value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} placeholder="Mother" />
            </div>
            <div>
              <label className="label-base">City</label>
              <input className="input-base" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Juba" />
            </div>
          </div>
          <div>
            <label className="label-base">Mobile money number</label>
            <input className="input-base" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="0922 123 456" />
          </div>
          <div>
            <label className="label-base">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              {(["MTN", "ZAIN"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, mobileMoneyProvider: p })}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-sm font-semibold transition",
                    form.mobileMoneyProvider === p
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-slate-300 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {p === "MTN" ? "MTN MoMo" : "Zain Cash"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1"
            disabled={saving || !form.fullName || !form.phone || !form.city}
            onClick={save}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving…" : "Add beneficiary"}
          </Button>
        </div>
      </div>
    </div>
  );
}
