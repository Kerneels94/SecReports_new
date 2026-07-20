/**
 * Input - A styled text input with optional label, inline error message, and password visibility toggle.
 * Wraps the native <input> element via forwardRef and auto-generates ids from labels.
 */

import { useState, InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

/** Props for the Input component */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelClassName?: string;
  error?: string;
}

/** A labeled input with error display and optional password toggle. Use in forms for text entry fields. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, labelClassName, error, id, type, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const isPassword = type === "password";
    const [visible, setVisible] = useState(false);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className={cn("text-sm font-medium text-text/90", labelClassName)}>
            {label}
          </label>
        )}
        <div className={cn(
          "relative flex items-center rounded-lg border border-border-light bg-surface transition-all duration-150 focus-within:ring-2 focus-within:ring-primary",
          isPassword && "pr-9",
          error && "border-danger/60 focus-within:ring-danger/20",
        )}>
          <input
            ref={ref}
            id={inputId}
            type={isPassword && visible ? "text" : type}
            className={cn(
              "flex-1 bg-transparent px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/60 outline-none disabled:opacity-50",
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setVisible((v) => !v)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-secondary/60 hover:text-text-secondary transition-colors"
              aria-label={visible ? "Hide password" : "Show password"}
            >
              {visible ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
