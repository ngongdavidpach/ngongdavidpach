"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { LogOut, Plus, User as UserIcon } from "lucide-react";
import { formatUsd } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export function TopBar({
  fullName,
  email,
  walletBalanceCents,
}: {
  fullName: string;
  email: string;
  walletBalanceCents: number;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <Logo href="/dashboard" />
      </div>
      <div className="hidden lg:block" />

      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/dashboard/wallet"
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-brand-300"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <span className="text-xs font-bold">$</span>
          </div>
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wide text-slate-400">Wallet</div>
            <div className="text-sm font-bold text-slate-900 tabular-nums">
              {formatUsd(walletBalanceCents)}
            </div>
          </div>
        </Link>

        <Link href="/dashboard/send" className="hidden sm:block">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Send / Pay
          </Button>
        </Link>

        <div className="relative">
          <button
            onClick={() => setMenu((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:border-slate-300"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-sm font-bold text-white">
              {fullName.charAt(0).toUpperCase()}
            </span>
            <span className="hidden text-sm font-medium text-slate-700 sm:block">
              {fullName.split(" ")[0]}
            </span>
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    {fullName}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-400">{email}</div>
                </div>
                <button
                  onClick={logout}
                  disabled={busy}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  {busy ? "Signing out…" : "Sign out"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
