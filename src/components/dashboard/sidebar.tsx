"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Send,
  Users,
  Receipt,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/send", label: "Send / Pay a bill", icon: Send },
  { href: "/dashboard/beneficiaries", label: "Beneficiaries", icon: Users },
  { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 flex-none border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <Logo href="/dashboard" />
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-slate-400")} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-emerald-800">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-sm font-semibold">KYC verified</span>
        </div>
        <p className="mt-1 text-xs text-emerald-700">
          Your account is cleared for payouts up to $5,000 / day.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-30 flex border-t border-slate-200 bg-white lg:hidden">
      {NAV.slice(0, 5).map(({ href, label, icon: Icon }) => {
        const active =
          pathname === href ||
          (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium",
              active ? "text-brand-700" : "text-slate-400",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">{label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
