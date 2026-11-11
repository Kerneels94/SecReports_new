"use client";

/**
 * Modal - An overlay dialog component with backdrop blur, ESC-to-close, and an optional title bar.
 * Renders nothing when `open` is false. Prevents background scroll while open.
 */

import { useEffect, useCallback, HTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** Props for the Modal component */
interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
}

/** A centered modal dialog with backdrop and escape-key handling. Use for confirmations, forms, or detail views. */
export function Modal({ open, onClose, title, children, className, ...props }: ModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [open, handleEscape]);

  if (!open || typeof document === "undefined") return null;

  // Portal to <body> so the modal escapes ancestor stacking contexts
  // (e.g. the dashboard <main> at z-10) and stays above the sidebar.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-xl bg-surface p-6 shadow-2xl shadow-black/50 animate-scale-in mx-4",
          className,
        )}
        {...props}
      >
        {title && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text">{title}</h2>
            <button
              onClick={onClose}
              className="cursor-pointer flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
