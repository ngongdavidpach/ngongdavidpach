"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/site/auth-shell";
import { Button } from "@/components/ui/button";

const COUNTRIES = [
  { code: "US", name: "🇺🇸 United States" },
  { code: "AU", name: "🇦🇺 Australia" },
  { code: "CA", name: "🇨🇦 Canada" },
  { code: "GB", name: "🇬🇧 United Kingdom" },
  { code: "AE", name: "🇦🇪 United Arab Emirates" },
  { code: "KE", name: "🇰🇪 Kenya" },
  { code: "UG", name: "🇺🇬 Uganda" },
  { code: "NO", name: "🇳🇴 Norway" },
  { code: "SE", name: "🇸🇪 Sweden" },
  { code: "DE", name: "🇩🇪 Germany" },
  { code: "SS", name: "🇸🇸 South Sudan" },
];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    residenceCountry: "US",
    city: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Registration failed");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Join the diaspora paying bills directly back home."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
            <span>{error}</span>
          </div>
        )}
        <div>
          <label className="label-base" htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            required
            value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)}
            className="input-base"
            placeholder="Your name"
          />
        </div>
        <div>
          <label className="label-base" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="input-base"
            placeholder="you@email.com"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-base" htmlFor="phone">Phone</label>
            <input
              id="phone"
              required
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className="input-base"
              placeholder="+1 555 000 1234"
            />
          </div>
          <div>
            <label className="label-base" htmlFor="city">City</label>
            <input
              id="city"
              required
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
              className="input-base"
              placeholder="Dallas, TX"
            />
          </div>
        </div>
        <div>
          <label className="label-base" htmlFor="country">Country of residence</label>
          <select
            id="country"
            value={form.residenceCountry}
            onChange={(e) => update("residenceCountry", e.target.value)}
            className="input-base"
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label-base" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            className="input-base"
            placeholder="At least 8 characters"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Creating account…" : "Create account"}
        </Button>
        <p className="text-center text-xs text-slate-400">
          By signing up you agree to our terms and KYC verification policy.
        </p>
      </form>
    </AuthShell>
  );
}
