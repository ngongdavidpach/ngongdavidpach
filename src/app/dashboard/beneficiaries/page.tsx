"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Phone,
  Plus,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import type { Beneficiary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AddBeneficiaryModal } from "@/components/dashboard/send-flow";
import { useRouter } from "next/navigation";

export default function BeneficiariesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/beneficiaries");
    const data = await res.json();
    setItems(data.beneficiaries || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    setDeleting(id);
    const res = await fetch(`/api/beneficiaries/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((b) => b.id !== id));
    }
    setDeleting(null);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Beneficiaries</h1>
          <p className="text-sm text-slate-500">
            People you send money to via MTN MoMo or Zain Cash.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4" /> Add beneficiary
        </Button>
      </div>

      {loading ? (
        <div className="card py-16 text-center text-sm text-slate-400">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-center">
          <Users className="h-10 w-10 text-slate-200" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No beneficiaries yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add a family member to start sending money to their mobile wallet.
          </p>
          <Button className="mt-4" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add your first beneficiary
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((b) => (
            <div key={b.id} className="card p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white">
                    {b.fullName.charAt(0)}
                  </span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{b.fullName}</div>
                    <div className="text-xs text-slate-400">{b.relationship}</div>
                  </div>
                </div>
                <button
                  onClick={() => remove(b.id)}
                  disabled={deleting === b.id}
                  className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete beneficiary"
                >
                  {deleting === b.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="mt-4 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="h-4 w-4 text-slate-400" /> {b.phone}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="h-4 w-4 text-center text-xs">📍</span> {b.city}, {b.country}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                    b.mobileMoneyProvider === "MTN"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-violet-100 text-violet-700"
                  }`}
                >
                  {b.mobileMoneyProvider === "MTN" ? "MTN MoMo" : "Zain Cash"}
                </span>
                <Link
                  href={`/dashboard/send?tab=momo`}
                  onClick={() => router.refresh()}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  Send →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddBeneficiaryModal
          onClose={() => setShowAdd(false)}
          onAdded={(b) => {
            setItems((prev) => [b, ...prev]);
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}
