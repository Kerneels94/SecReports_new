/**
 * Button - A reusable button component with multiple variants, sizes, and a loading state.
 * Wraps the native <button> element via forwardRef.
 */

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

/** Props for the Button component */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "gradient";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary:
    "bg-primary text-gray-900 shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:bg-primary-hover active:shadow-md",
  secondary:
    "bg-surface text-text border border-border hover:bg-surface-elevated hover:border-border-light active:bg-surface-elevated",
  danger:
    "bg-danger text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:bg-red-600 active:shadow-md",
  ghost:
    "text-text-secondary hover:text-text hover:bg-surface-elevated",
  gradient:
    "bg-gradient-to-r from-primary to-primary-hover text-gray-900 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:from-primary-hover hover:to-primary active:shadow-md",
};

const sizeStyles: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

/** A styled button with variant/size/loading support. Use for all primary and secondary actions. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface-secondary disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
