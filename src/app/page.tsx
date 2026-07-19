import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  GraduationCap,
  Landmark,
  Lock,
  Receipt,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  TrendingDown,
  Zap,
  Check,
  Globe2,
} from "lucide-react";
import { MarketingHeader } from "@/components/site/marketing-header";
import { MarketingFooter } from "@/components/site/marketing-footer";
import { SavingsCalculator } from "@/components/site/savings-calculator";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingHeader />
      <Hero />
      <StatsBar />
      <ProblemSolution />
      <Services />
      <HowItWorks />
      <Pricing />
      <Rails />
      <Security />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-brand-50/60 via-white to-white" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 top-40 h-72 w-72 rounded-full bg-gold-200/40 blur-3xl" />
      <div className="container-page relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2 lg:py-28">
        <div className="animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
            Built for the South Sudanese diaspora
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Send money home.
            <span className="block bg-gradient-to-r from-brand-700 to-emerald-500 bg-clip-text text-transparent">
              Pay bills directly.
            </span>
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Stop sending cash that can be lost or misused. Junub Pay lets the
            diaspora pay <strong className="text-slate-900">school fees, medical
            bills and utilities</strong> straight to verified providers in South
            Sudan — faster, safer, and at fees that beat Western Union.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto">
                Start paying bills <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                See the savings
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-brand-600" /> No cash to lose
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-brand-600" /> MTN MoMo & Zain Cash
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-brand-600" /> Receipts for family
            </span>
          </div>
        </div>

        <HeroReceipt />
      </div>
    </section>
  );
}

function HeroReceipt() {
  return (
    <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:120ms]">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-200/50 to-gold-200/30 blur-2xl" />
      <div className="relative rotate-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl transition hover:rotate-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">University of Juba</div>
              <div className="text-xs text-slate-400">School fees • verified</div>
            </div>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            PAID
          </span>
        </div>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-400">Amount settled</div>
          <div className="mt-1 text-3xl font-bold text-slate-900">$800.00</div>
          <div className="mt-1 text-sm text-slate-500">≈ SSP 1,142,400 to provider</div>
        </div>

        <dl className="mt-5 space-y-2.5 text-sm">
          {[
            ["Student", "Akol, STU-2024-1182"],
            ["Fee", "$14.90 (1.8%)"],
            ["Channel", "Provider ledger"],
            ["Reference", "STL-7F2A9K"],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <dt className="text-slate-400">{k}</dt>
              <dd className="font-medium text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Receipt sent to your family in Juba
        </div>
      </div>

      {/* floating mini card */}
      <div className="absolute -bottom-6 -left-6 hidden w-48 rotate-[-3deg] rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:block">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
            <TrendingDown className="h-4 w-4" />
          </div>
          <div className="text-xs font-semibold text-slate-700">You saved</div>
        </div>
        <div className="mt-2 text-2xl font-bold text-brand-700">$61.20</div>
        <div className="text-[11px] text-slate-400">vs. Western Union</div>
      </div>
    </div>
  );
}

function StatsBar() {
  const stats = [
    { value: "$1.3B+", label: "Remitted to South Sudan yearly" },
    { value: "8–12%", label: "What traditional transfer operators cost" },
    { value: "~1.8%", label: "Junub Pay fee on direct bill pay" },
    { value: "24/7", label: "Settlement across MTN & Zain rails" },
  ];
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="container-page grid grid-cols-2 divide-x divide-slate-200 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="px-4 py-8 text-center">
            <div className="text-2xl font-bold text-slate-900 sm:text-3xl">{s.value}</div>
            <div className="mt-1 text-xs text-slate-500 sm:text-sm">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProblemSolution() {
  return (
    <section className="py-20">
      <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <SectionTag>The problem</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Remittances keep South Sudan running. The tools haven&rsquo;t.
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            A huge share of the country&rsquo;s income is money sent home by the
            diaspora. Today that relies on expensive cash transfers and risky
            informal couriers — and even when the cash arrives, it can be spent
            on anything but the need it was meant for.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Western Union & agents charge up to 12% all-in",
              "Cash couriers can lose everything to theft",
              "Money meant for school fees gets diverted",
              "Family has no proof the bill was actually paid",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3 text-slate-700">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-100 text-red-600">
                  ✕
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white sm:p-10">
          <SectionTag tone="light">The Junub Pay way</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Don&rsquo;t send cash. Send care.
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            Pay the bill itself. The money goes straight to the school, hospital
            or utility — never becomes loose cash — and your family gets a
            receipt proving it&rsquo;s settled.
          </p>
          <ul className="mt-6 space-y-3">
            {[
              "Funds land directly with the verified provider",
              "Transparent fees under 3%, shown before you pay",
              "Instant mobile-money option for trusted recipients",
              "Shareable settlement receipts for peace of mind",
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-white/20 text-gold-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Services() {
  const items = [
    { icon: GraduationCap, title: "School fees", desc: "Tuition, boarding and exam fees to universities and secondary schools.", tone: "from-emerald-500 to-emerald-700" },
    { icon: Stethoscope, title: "Medical bills", desc: "Settle hospital and clinic invoices directly with the billing office.", tone: "from-rose-500 to-red-700" },
    { icon: Zap, title: "Utility top-ups", desc: "Electricity meters, water accounts and fuel with Nilepet.", tone: "from-amber-500 to-yellow-600" },
    { icon: Smartphone, title: "Mobile money", desc: "Send to MTN MoMo and Zain Cash wallets for trusted family.", tone: "from-blue-500 to-indigo-600" },
    { icon: Landmark, title: "Government fees", desc: "Passports, immigration and Revenue Authority payments.", tone: "from-violet-500 to-indigo-700" },
    { icon: Receipt, title: "Airtime & data", desc: "Top up MTN and Zain airtime for loved ones instantly.", tone: "from-purple-500 to-violet-600" },
  ];
  return (
    <section id="services" className="bg-slate-50 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <SectionTag center>What you can pay</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            One corridor, every essential bill
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            Connect to verified South Sudanese service providers and pay the
            things that actually matter — not generic cash transfers.
          </p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, desc, tone }) => (
            <div
              key={title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-card-hover"
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tone} text-white shadow-sm`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Top up your wallet", desc: "Fund your Junub Pay wallet from your bank or card abroad — securely, in USD.", icon: Globe2 },
    { n: "02", title: "Pick what to pay", desc: "Choose a verified provider and enter a student, patient or meter reference.", icon: Receipt },
    { n: "03", title: "Confirm the fee", desc: "See the SSP amount, the fee and your total before you confirm. No surprises.", icon: TrendingDown },
    { n: "04", title: "Settled & receipted", desc: "The provider is credited instantly and your family gets proof of payment.", icon: ShieldCheck },
  ];
  return (
    <section id="how" className="py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <SectionTag center>How it works</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From diaspora to paid in four steps
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ n, title, desc, icon: Icon }) => (
            <div key={n} className="relative rounded-2xl border border-slate-200 bg-white p-6">
              <div className="absolute right-5 top-5 text-3xl font-bold text-slate-100">{n}</div>
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="bg-slate-50 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <SectionTag center>Pricing</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Honest fees that beat the market
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            We make money on a small, transparent transaction fee — not hidden
            FX margins. Try any amount.
          </p>
        </div>
        <div className="mt-12">
          <SavingsCalculator />
        </div>
      </div>
    </section>
  );
}

function Rails() {
  return (
    <section className="py-20">
      <div className="container-page">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionTag>Local rails</SectionTag>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Connected to mobile money South Sudan actually uses
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              When you need to send to a person, Junub Pay disburses through the
              two dominant mobile-money networks — so funds land in a wallet your
              family already has.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <RailCard name="MTN MoMo" tag="Mobile money" color="bg-yellow-400 text-yellow-950" />
              <RailCard name="Zain Cash" tag="Mobile money" color="bg-violet-600 text-white" />
              <RailCard name="Provider ledger" tag="Direct bill pay" color="bg-brand-600 text-white" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-brand-600" />
              <h3 className="font-semibold text-slate-900">Typical settlement times</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ["Bill payment", "Instant — credited to provider ledger"],
                ["Mobile money (MTN / Zain)", "Under 60 seconds to wallet"],
                ["Wallet top-up", "Available immediately"],
                ["Refund on failure", "Auto-returned to wallet"],
              ].map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
                  <span className="font-medium text-slate-700">{k}</span>
                  <span className="text-slate-500">{v}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function RailCard({ name, tag, color }: { name: string; tag: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 pr-5">
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${color}`}>
        {name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900">{name}</div>
        <div className="text-xs text-slate-400">{tag}</div>
      </div>
    </div>
  );
}

function Security() {
  const items = [
    { icon: Lock, title: "Encrypted end to end", desc: "Bank-grade TLS and encrypted wallets. Funds only move on authenticated sessions." },
    { icon: ShieldCheck, title: "KYC verified", desc: "Diaspora accounts and providers are identity-checked before payouts clear." },
    { icon: Building2, title: "Verified providers only", desc: "Schools, hospitals and utilities are onboarded and reconciliation-ready." },
    { icon: Clock, title: "Auditable ledger", desc: "Every transaction is double-entry bookkept with shareable settlement refs." },
  ];
  return (
    <section id="trust" className="bg-slate-900 py-20 text-white">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <SectionTag tone="light" center>Security & trust</SectionTag>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Built like the bank, simple like an app
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="py-20">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-emerald-900 px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gold-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl" />
          <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Your next payment home should arrive as a receipt, not a risk.
          </h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-lg text-brand-100">
            Join the diaspora using Junub Pay to fund education, healthcare and
            essentials — directly, transparently, for less.
          </p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register">
              <Button size="lg" variant="gold" className="w-full sm:w-auto">
                Create your free account
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" className="w-full bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionTag({
  children,
  center,
  tone = "dark",
}: {
  children: React.ReactNode;
  center?: boolean;
  tone?: "dark" | "light";
}) {
  return (
    <span
      className={`inline-block text-sm font-semibold uppercase tracking-wider ${tone === "light" ? "text-brand-300" : "text-brand-600"} ${center ? "" : ""}`}
    >
      {children}
    </span>
  );
}
