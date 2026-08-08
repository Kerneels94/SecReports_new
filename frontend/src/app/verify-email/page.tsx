"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { api } from "@/services/api";

type VerifyState = "loading" | "success" | "error";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) return token;
  const hash = window.location.hash;
  const hashParams = new URLSearchParams(hash.replace("#", ""));
  return hashParams.get("token");
}

function VerifyEmailContent() {
  const [token] = useState(getTokenFromUrl);
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (token && typeof window !== "undefined") {
      window.history.replaceState({}, "", "/verify-email");
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("Missing verification token");
      return;
    }

    api
      .post<{ message: string }>("/auth/verify-email", { token })
      .then((res) => {
        setState("success");
        setMessage(res.data.message);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      });
  }, [token]);

  const icon = {
    loading: (
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    ),
    success: (
      <svg className="h-7 w-7 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-hover shadow-lg shadow-primary/25">
          {icon[state]}
        </div>
        <CardTitle>
          {state === "loading" && "Verifying..."}
          {state === "success" && "Email Verified"}
          {state === "error" && "Verification Failed"}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-text-secondary">{message}</p>
        <div className="mt-6">
          {state === "success" ? (
            <Link
              href="/login"
              className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
            >
              Go to Login
            </Link>
          ) : (
            <Link
              href="/"
              className="text-primary hover:underline transition-colors text-sm"
            >
              Back to Homepage
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <VerifyEmailContent />
    </div>
  );
}
