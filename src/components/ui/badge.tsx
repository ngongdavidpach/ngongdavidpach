import { cn } from "@/lib/cn";
import type { TransactionStatus } from "@/lib/types";

export function Badge({
  className,
  tone = "slate",
  children,
}: {
  className?: string;
  tone?:
    | "slate"
    | "green"
    | "gold"
    | "red"
    | "blue"
    | "purple";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    gold: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-violet-100 text-violet-700",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TransactionStatus }) {
  switch (status) {
    case "success":
      return <Badge tone="green">Success</Badge>;
    case "processing":
      return <Badge tone="blue">Processing</Badge>;
    case "pending":
      return <Badge tone="gold">Pending</Badge>;
    case "failed":
      return <Badge tone="red">Failed</Badge>;
    case "reversed":
      return <Badge tone="slate">Reversed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}
