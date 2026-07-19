import Link from "next/link";
import { cn } from "@/lib/cn";

interface LogoProps {
  className?: string;
  showWordmark?: boolean;
  href?: string;
  /** "light" renders a white wordmark for dark backgrounds. */
  tone?: "dark" | "light";
}

/**
 * Junub Pay brand mark — a stylized "J" formed by an upward remittance flow
 * (a coin rising), echoing the South Sudan flag's blue triangle + yellow star.
 */
export function Logo({
  className,
  showWordmark = true,
  href = "/",
  tone = "dark",
}: LogoProps) {
  const mark = (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 shadow-sm">
        {/* upward flow bars */}
        <svg
          viewBox="0 0 40 40"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <path d="M8 26 L20 10 L32 26" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
          <circle cx="20" cy="9.5" r="3" fill="#fde68a" />
        </svg>
      </span>
      {showWordmark && (
        <span
          className={cn(
            "text-lg font-bold tracking-tight",
            tone === "light" ? "text-white" : "text-slate-900",
          )}
        >
          Junub<span className="text-brand-600">Pay</span>
        </span>
      )}
    </span>
  );

  if (!href) return mark;
  return (
    <Link href={href} className="inline-flex items-center" aria-label="Junub Pay home">
      {mark}
    </Link>
  );
}
