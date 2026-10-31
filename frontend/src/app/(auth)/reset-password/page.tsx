/**
 * Reset password page — reads token from query string and allows setting a new password.
 * @route /reset-password
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services";
import { AuthShell } from "@/components/auth/AuthShell";

/** Same rules as the backend's strongPassword, so a weak password is caught here with a clear message. */
const PASSWORD_RULES: [RegExp, string][] = [
  [/[a-z]/, "Must include a lowercase letter"],
  [/[A-Z]/, "Must include an uppercase letter"],
  [/\d/, "Must include a number"],
  [/[^a-zA-Z0-9]/, "Must include a special character"],
];

const POLICY = [
  "At least 8 characters",
  "At least one lowercase letter",
  "At least one uppercase letter",
  "At least one digit",
  "At least one special character",
];

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

    const failedRule = PASSWORD_RULES.find(([rule]) => !rule.test(password));
    if (failedRule) {
      setError(failedRule[1]);
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
      <div className="done">
        <span className="icon-box">
          <svg className="icon" aria-hidden="true">
            <use href="#i-lock" />
          </svg>
        </span>
        <h3>Invalid reset link</h3>
        <p>Invalid reset link. No token provided.</p>
        <p style={{ marginTop: 24 }}>
          <button
            className="btn btn-primary btn-block"
            type="button"
            onClick={() => router.push("/forgot-password")}
          >
            Request a new reset link
          </button>
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="done">
        <span className="icon-box">
          <svg className="icon" aria-hidden="true">
            <use href="#i-check" />
          </svg>
        </span>
        <h3>Password Reset</h3>
        <p>Your password has been reset successfully.</p>
        <p style={{ marginTop: 24 }}>
          <button
            className="btn btn-primary btn-block"
            type="button"
            onClick={() => router.push("/login")}
          >
            Sign In
          </button>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="auth-icon">
        <svg className="icon" aria-hidden="true">
          <use href="#i-lock" />
        </svg>
      </div>
      <h1 className="auth-title">Set New Password</h1>
      <p className="auth-sub">Enter your new password below.</p>
      <form className="form" onSubmit={handleSubmit}>
        <div>
          <label className="label" htmlFor="reset-password">
            New Password
          </label>
          <input
            className="input"
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <p className="label">A strong password contains:</p>
          <ul className="checklist" aria-label="Password policy">
            {POLICY.map((rule, index) => {
              const checks = [
                password.length >= 8,
                /[a-z]/.test(password),
                /[A-Z]/.test(password),
                /\d/.test(password),
                /[^a-zA-Z0-9]/.test(password),
              ];
              return (
                <li key={rule} className={checks[index] ? "met" : undefined}>
                  {rule}
                </li>
              );
            })}
          </ul>
        </div>
        <div>
          <label className="label" htmlFor="reset-confirm">
            Confirm Password
          </label>
          <input
            className="input"
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <button
          className="btn btn-primary btn-block"
          type="submit"
          disabled={loading}
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>
      </form>
    </>
  );
}

/** Reset password page. */
export default function ResetPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title={
        <>
          Set a new password. <span className="grad">Get back to work.</span>
        </>
      }
      lead="Choose a strong password to keep your incident records safe."
      ticks={["8+ characters", "Mixed case", "Number and symbol"]}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
