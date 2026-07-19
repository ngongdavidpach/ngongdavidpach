"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Building2, LayoutDashboard, Receipt, Users } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/providers", label: "Providers", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 flex-none border-r border-slate-800 bg-slate-900 lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2 border-b border-slate-800 px-6">
        <Logo href="/admin" tone="light" />
        <span className="rounded bg-gold-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold-300">
          Ops
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== "/admin" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="m-4 rounded-xl border border-slate-800 bg-slate-800/50 p-4">
        <div className="flex items-center gap-2 text-slate-300">
          <BarChart3 className="h-4 w-4" />
          <span className="text-sm font-semibold">Operations</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Monitor corridor volume, settlement and providers.
        </p>
      </div>
    </aside>
  );
}
