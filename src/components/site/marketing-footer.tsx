import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ShieldCheck } from "lucide-react";

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              A digital remittance corridor letting the South Sudanese diaspora
              pay school fees, medical bills and utilities directly to verified
              providers back home — instead of sending cash that can be misused.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Bank-grade encryption • KYC verified
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Product</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link href="#services" className="hover:text-slate-900">Bill pay</Link></li>
              <li><Link href="#pricing" className="hover:text-slate-900">Pricing</Link></li>
              <li><Link href="/register" className="hover:text-slate-900">Create account</Link></li>
              <li><Link href="/login" className="hover:text-slate-900">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><span className="cursor-default">About</span></li>
              <li><span className="cursor-default">Compliance</span></li>
              <li><span className="cursor-default">Support</span></li>
              <li><span className="cursor-default">Status</span></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Junub Pay. Built for the South Sudanese diaspora.</p>
          <p className="max-w-md">
            Demo platform. Mobile-money and provider integrations are simulated.
          </p>
        </div>
      </div>
    </footer>
  );
}
