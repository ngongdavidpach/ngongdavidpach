"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export function AdminTopBar({ email }: { email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 sm:px-6">
      <div className="lg:hidden">
        <Logo href="/admin" tone="light" />
      </div>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="hidden items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 sm:flex"
        >
          <ExternalLink className="h-3.5 w-3.5" /> View site
        </Link>
        <div className="hidden text-right sm:block">
          <div className="text-xs text-slate-400">Signed in as</div>
          <div className="text-sm font-medium text-white">{email}</div>
        </div>
        <button
          onClick={logout}
          disabled={busy}
          className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:bg-slate-800"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
