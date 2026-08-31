/**
 * Reset password page — reads token from query string and allows setting a new password.
 * @route /reset-password
 */
"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { authService } from "@/services";

function getTokenFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) return token;
  const hash = window.location.hash;
  const hashParams = new URLSearchParams(hash.replace("#", ""));
  return hashParams.get("token");
}

/** Inner form component that reads the token and handles password reset submission. */
function ResetPasswordForm() {
  const router = useRouter();
  const [token] = useState(getTokenFromUrl);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token && typeof window !== "undefined") {
      window.history.replaceState({}, "", "/reset-password");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token!, password);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Card variant="elevated" className="w-full max-w-sm animate-slide-up">
        <CardContent className="pt-6">
          <p className="text-center text-text-secondary">Invalid reset link. No token provided.</p>
          <div className="mt-4 text-center">
            <button onClick={() => router.push("/forgot-password")} className="text-sm text-primary hover:underline">
              Request a new reset link
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card variant="elevated" className="w-full max-w-sm animate-slide-up">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/25">
            <svg className="h-6 w-6 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <CardTitle>Password Reset</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-secondary text-center">
            Your password has been reset successfully.
          </p>
          <div className="mt-6 text-center">
            <Button onClick={() => router.push("/login")} className="w-full">
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className="w-full max-w-sm animate-slide-up">
      <CardHeader className="text-center">
        <CardTitle>Set New Password</CardTitle>
        <p className="mt-1 text-sm text-text-secondary">
          Enter your new password below
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="New Password"
            type="password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <p className="text-sm font-medium text-text/90 -my-1">A strong password contains:</p>
          <ul className="text-sm text-text-secondary/60 space-y-0.5 ml-1">
            <li>At least 8 characters</li>
            <li>At least one lowercase letter</li>
            <li>At least one uppercase letter</li>
            <li>At least one digit</li>
            <li>At least one special character</li>
          </ul>
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Reset password page. */
export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-secondary px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.06),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(134,239,172,0.03),transparent_50%)] pointer-events-none" />
      <ResetPasswordForm />
    </div>
  );
}
