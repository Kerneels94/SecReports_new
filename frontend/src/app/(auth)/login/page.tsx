/**
 * Login page — supports both company and senior sign-in with tabbed form.
 * @route /login
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { AuthShell } from "@/components/auth/AuthShell";

const schema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type FormData = z.infer<typeof schema>;

/** Login page component with company/senior tabs, email/password form, and error handling. */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"company" | "senior">("company");
  const [showPassword, setShowPassword] = useState(false);

  const isCompany = tab === "company";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setError(null);
      const user = await login(data);
      router.push(user.role === "superadmin" ? "/portal" : "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <AuthShell
      eyebrow="Incident reporting for private security"
      title={
        <>
          Your control room&apos;s record of{" "}
          <span className="grad">every incident.</span>
        </>
      }
      lead="Pick up where your team left off — every report, response time and client export in one place."
      ticks={[
        "Log call-outs with operator, dispatcher and call sign",
        "Track dispatch-to-arrival response times",
        "Send clients a PDF report in one click",
      ]}
    >
      <div className="auth-icon">
        <svg className="icon" aria-hidden="true">
          <use href="#i-lock" />
        </svg>
      </div>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-sub">Sign in to your SecReports account.</p>

      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <div className="segmented" role="group" aria-label="Sign in as">
          <button
            type="button"
            aria-pressed={isCompany}
            onClick={() => setTab("company")}
          >
            Admin/Manager
          </button>
          <button
            type="button"
            aria-pressed={!isCompany}
            onClick={() => setTab("senior")}
          >
            Senior
          </button>
        </div>

        {error && (
          <div
            className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
            role="alert"
          >
            {error}
          </div>
        )}

        <div>
          <label className="label" htmlFor="login-email">
            Email
          </label>
          <input
            className="input"
            id="login-email"
            type="email"
            placeholder={isCompany ? "company@example.com" : "you@example.com"}
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-danger" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="label-row">
            <label className="label" htmlFor="login-password">
              Password
            </label>
            <a href="/forgot-password">Forgot password?</a>
          </div>
          <div className="pw">
            <input
              className="input"
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            <button
              className="pw-toggle"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              <svg className="icon" aria-hidden="true">
                <use href={showPassword ? "#i-eye-off" : "#i-eye"} />
              </svg>
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-danger" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        <button className="btn btn-primary btn-block" type="submit">
          {isSubmitting
            ? "Signing in..."
            : `Sign in as ${isCompany ? "Admin/Manager" : "Senior"}`}
        </button>
      </form>

      <p className="auth-links">
        New to SecReports? <Link href="/register">Start a free trial</Link>
      </p>
      <p style={{ textAlign: "center" }}>
        <Link className="auth-back" href="/">
          <svg className="icon" aria-hidden="true">
            <use href="#i-arrow" />
          </svg>
          Back to homepage
        </Link>
      </p>
    </AuthShell>
  );
}
