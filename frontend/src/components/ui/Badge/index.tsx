/**
 * Badge - A small label component used to indicate status, category, or count.
 * Supports multiple color variants and an optional dot indicator.
 */

import { cn } from "@/lib/cn";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

/** Props for the Badge component */
interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-slate-800 text-slate-200 ring-1 ring-slate-700/50",
  success: "bg-green-900/30 text-green-300 ring-1 ring-green-500/20",
  warning: "bg-yellow-900/30 text-yellow-300 ring-1 ring-yellow-500/20",
  danger: "bg-red-900/30 text-red-300 ring-1 ring-red-500/20",
  info: "bg-blue-900/30 text-blue-300 ring-1 ring-blue-500/20",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-slate-400",
  success: "bg-green-400",
  warning: "bg-yellow-400",
  danger: "bg-red-400",
  info: "bg-blue-400",
};

/** A themed badge with optional dot. Use to highlight status or metadata inline. */
export function Badge({ children, variant = "default", dot, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />}
      {children}
    </span>
  );
}
