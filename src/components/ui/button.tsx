import { forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
        secondary:
          "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 active:bg-slate-100",
        gold: "bg-gold-500 text-slate-900 shadow-sm hover:bg-gold-400 active:bg-gold-600",
        ghost: "text-slate-700 hover:bg-slate-100 active:bg-slate-200",
        danger:
          "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
        outline:
          "border border-brand-600 text-brand-700 hover:bg-brand-50 active:bg-brand-100",
      },
      size: {
        sm: "h-9 px-3.5",
        md: "h-11 px-5",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
