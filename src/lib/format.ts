// Pure, client-safe formatting helpers (no server-only imports).

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const dollars = Math.abs(cents) / 100;
  return `${sign}$${dollars.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatUsdCompact(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const sign = cents < 0 ? "-" : "";
  if (dollars >= 1_000_000) return `${sign}$${(dollars / 1_000_000).toFixed(1)}M`;
  if (dollars >= 1_000) return `${sign}$${(dollars / 1_000).toFixed(1)}K`;
  return formatUsd(cents);
}

export function formatSsp(pounds: number): string {
  return `SSP ${pounds.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatSspCompact(pounds: number): string {
  if (pounds >= 1_000_000) return `SSP ${(pounds / 1_000_000).toFixed(1)}M`;
  if (pounds >= 1_000) return `SSP ${(pounds / 1_000).toFixed(1)}K`;
  return formatSsp(pounds);
}

export function parseDollars(input: string | number): number {
  if (typeof input === "number") return input;
  const cleaned = input.replace(/[^0-9.]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}
