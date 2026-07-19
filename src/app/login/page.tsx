"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { AuthShell } from "@/components/site/auth-shell";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sign in failed");
      const dest = data.user?.role === "admin" ? "/admin" : "/dashboard";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your remittances and bill payments."
      footer={
        <>
          New to Junub Pay?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
            Create an account
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
          <label className="label-base" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base"
            placeholder="you@email.com"
          />
        </div>
        <div>
          <label className="label-base" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-base"
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <div className="font-semibold text-slate-700">Demo accounts</div>
        <div className="mt-1 text-slate-500">
          Diaspora: <code className="rounded bg-white px-1.5 py-0.5">demo@junubpay.ss</code> /{" "}
          <code className="rounded bg-white px-1.5 py-0.5">demo1234</code>
        </div>
        <div className="mt-1 text-slate-500">
          Admin: <code className="rounded bg-white px-1.5 py-0.5">admin@junubpay.ss</code> /{" "}
          <code className="rounded bg-white px-1.5 py-0.5">admin123</code>
        </div>
      </div>
    </AuthShell>
  );
}
