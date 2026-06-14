/**
 * Card - A container component with multiple visual variants.
 * Also exports CardHeader, CardTitle, and CardContent sub-components for structured layouts.
 */

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

/** Props for the Card component */
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "bordered" | "elevated";
}

/** A themed container card. Use to group related content into a distinct visual section. */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl bg-surface p-6 shadow-lg shadow-black/20 transition-all duration-200",
          variant === "bordered" && "border border-border-light",
          variant === "elevated" && "bg-surface-elevated shadow-xl shadow-black/30 hover:shadow-2xl hover:shadow-black/40 hover:-translate-y-0.5",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Card.displayName = "Card";

/** Header section of a Card, typically containing the title or actions. */
export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mb-4", className)} {...props}>
      {children}
    </div>
  );
}

/** Title element rendered inside CardHeader. */
export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold text-text", className)} {...props}>
      {children}
    </h3>
  );
}

/** Main body content area of a Card. */
export function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}
