import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { GraduationCap, ShieldCheck, TrendingDown } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-emerald-950 p-12 text-white lg:flex">
        <div className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
        <Link href="/" className="relative">
          <Logo tone="light" />
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-tight">
            Pay school fees, medical bills and utilities — straight to the
            provider back home.
          </h2>
          <div className="mt-8 space-y-4">
            {[
              { icon: TrendingDown, t: "Fees from ~1.8%", d: "A fraction of Western Union and MoneyGram." },
              { icon: ShieldCheck, t: "No cash to lose", d: "Money lands with verified schools and hospitals." },
              { icon: GraduationCap, t: "Built for the diaspora", d: "USD wallet, MTN MoMo & Zain Cash rails." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-5 w-5 text-gold-300" />
                </span>
                <div>
                  <div className="font-semibold">{t}</div>
                  <div className="text-sm text-brand-100">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-brand-200">
          “Junub” — home, south, where the heart is.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-col px-6 py-10 sm:px-12">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1.5 text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-500">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
