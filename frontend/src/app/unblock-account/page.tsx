"use client";

/**
 * Unblock account page: opened from the account-blocked email. Reads the
 * one-time token, strips it from the URL, and posts it to /auth/unblock.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { api } from "@/services/api";

type UnblockState = "loading" | "success" | "error";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) return token;
  const hash = window.location.hash;
  const hashParams = new URLSearchParams(hash.replace("#", ""));
  return hashParams.get("token");
}

function UnblockAccountContent() {
  const [token] = useState(getTokenFromUrl);
  const [state, setState] = useState<UnblockState>(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "Missing unblock token");

  useEffect(() => {
    if (token && typeof window !== "undefined") {
      window.history.replaceState({}, "", "/unblock-account");
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;

    api
      .post<{ message: string }>("/auth/unblock", { token })
      .then((res) => {
        setState("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Unblock failed");
      });
  }, [token]);

  const icon = {
    loading: (
      <svg
        className="h-7 w-7 animate-pulse text-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
    success: (
      <svg className="h-7 w-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
    error: (
      <svg className="h-7 w-7 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    ),
  };

  return (
    <Card variant="elevated" className="w-full max-w-sm animate-slide-up">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-fill shadow-lg shadow-primary-fill/25">
          {icon[state]}
        </div>
        <CardTitle>
          {state === "loading" && "Unblocking..."}
          {state === "success" && "Account Unblocked"}
          {state === "error" && "Unblock Failed"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-text-secondary">{message}</p>
        <div className="mt-6">
          {state === "success" ? (
            <Link
              href="/login"
              className="cursor-pointer block w-full rounded-lg bg-primary-fill py-2.5 text-center text-sm font-medium text-white hover:bg-primary-fill-hover transition-colors"
            >
              Go to Login
            </Link>
          ) : (
            <Link
              href="/forgot-password"
              className="cursor-pointer text-primary hover:underline transition-colors text-sm"
            >
              Reset your password instead
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function UnblockAccountPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <UnblockAccountContent />
    </div>
  );
}
