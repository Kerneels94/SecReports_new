/**
 * Forgot password page — accepts email and sends a password reset link.
 * @route /forgot-password
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/services";
import { AuthShell } from "@/components/auth/AuthShell";

/** Forgot password page component — shows email form then success state after submission. */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authService.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Account recovery"
      title={
        <>
          Locked out? <span className="grad">Back in two minutes.</span>
        </>
      }
      lead="We'll email you a link to set a new password. Strong passwords keep your incident records safe."
      ticks={[
        "At least 8 characters",
        "Upper- and lowercase letters",
        "At least one number and one special character",
      ]}
    >
      {submitted ? (
        <div className="done">
          <span className="icon-box">
            <svg className="icon" aria-hidden="true">
              <use href="#i-mail" />
            </svg>
          </span>
          <h3>Check your email</h3>
          <p>
            A reset link has been sent. If an account exists for{" "}
            <strong>{email}</strong>, a password reset link is on its way.
          </p>
        </div>
      ) : (
        <>
          <div className="auth-icon">
            <svg className="icon" aria-hidden="true">
              <use href="#i-key" />
            </svg>
          </div>
          <h1 className="auth-title">Reset password</h1>
          <p className="auth-sub">
            Enter your email and we&apos;ll send you a reset link.
          </p>
          <form className="form" onSubmit={handleSubmit}>
            <div>
              <label className="label" htmlFor="forgot-email">
                Email
              </label>
              <input
                className="input"
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        </>
      )}
      <p style={{ textAlign: "center" }}>
        <button
          className="auth-back"
          type="button"
          onClick={() => router.push("/login")}
          style={{ background: "none", border: 0, cursor: "pointer" }}
        >
          <svg className="icon" aria-hidden="true">
            <use href="#i-arrow" />
          </svg>
          Back to sign in
        </button>
      </p>
    </AuthShell>
  );
}
