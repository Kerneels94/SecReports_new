/**
 * Registration page — company sign-up with name, email, password, and confirm password.
 * @route /register
 */
"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { authService } from "@/services";
import { AuthShell } from "@/components/auth/AuthShell";

const registerSchema = z
  .object({
    companyName: z.string().min(1, "Company name is required"),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Must include a lowercase letter")
      .regex(/[A-Z]/, "Must include an uppercase letter")
      .regex(/\d/, "Must include a number")
      .regex(/[^a-zA-Z0-9]/, "Must include a special character"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const PASSWORD_RULES = [
  { key: "length", label: "8+ characters", test: (v: string) => v.length >= 8 },
  { key: "lower", label: "Lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { key: "upper", label: "Uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { key: "digit", label: "Number", test: (v: string) => /\d/.test(v) },
  {
    key: "special",
    label: "Special character",
    test: (v: string) => /[^A-Za-z0-9]/.test(v),
  },
];

/** Registration page component with Zod-validated form and live password policy. */
export default function RegisterPage() {
  const [registered, setRegistered] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const password = watch("password") ?? "";
  const confirmPassword = watch("confirmPassword") ?? "";
  const passwordsMatch = !!confirmPassword && password === confirmPassword;

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      const res = await authService.register({
        companyName: data.companyName,
        name: data.name,
        email: data.email,
        password: data.password,
      });
      setSuccessMessage(res.data.message);
      setRegistered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  };

  return (
    <AuthShell
      eyebrow="14-day free trial"
      title={
        <>
          Put every incident <span className="grad">on record</span> — starting
          today.
        </>
      }
      ticks={[
        "Full access to every feature",
        "Up to 3 users during your trial",
        "No credit card required",
      ]}
      nextSteps={[
        "Create your company account",
        "Verify your email address",
        "Log your first incident",
      ]}
    >
      {registered ? (
        <div className="done">
          <span className="icon-box">
            <svg className="icon" aria-hidden="true">
              <use href="#i-mail" />
            </svg>
          </span>
          <h3>Check your email</h3>
          <p>{successMessage || "Account created successfully"}</p>
          <p style={{ marginTop: 24 }}>
            <Link className="btn btn-primary btn-block" href="/login">
              Go to sign in
            </Link>
          </p>
        </div>
      ) : (
        <>
          <h1 className="auth-title">Create your account</h1>
          <p className="auth-sub">
            Register your company and start your free trial.
          </p>
          <form className="form" onSubmit={handleSubmit(onSubmit)}>
            {error && (
              <div
                className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label className="label" htmlFor="register-company">
                Company Name
              </label>
              <input
                className="input"
                id="register-company"
                autoComplete="organization"
                placeholder="Your Security Company"
                aria-invalid={!!errors.companyName}
                {...register("companyName")}
              />
              {errors.companyName && (
                <p className="text-sm text-danger" role="alert">
                  {errors.companyName.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="register-name">
                Your Name
              </label>
              <input
                className="input"
                id="register-name"
                autoComplete="name"
                placeholder="John Doe"
                aria-invalid={!!errors.name}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-danger" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="register-email">
                Email
              </label>
              <input
                className="input"
                id="register-email"
                type="email"
                autoComplete="email"
                placeholder="company@example.com"
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
              <label className="label" htmlFor="register-password">
                Password
              </label>
              <div className="pw">
                <input
                  className="input"
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  aria-describedby="password-rules"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                />
              </div>
              <ul
                className="checklist"
                id="password-rules"
                aria-label="Password policy"
              >
                {PASSWORD_RULES.map((rule) => (
                  <li
                    key={rule.key}
                    className={rule.test(password) ? "met" : undefined}
                  >
                    {rule.label}
                  </li>
                ))}
              </ul>
              {errors.password && (
                <p className="text-sm text-danger" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="label" htmlFor="register-confirm">
                Confirm Password
              </label>
              <div className="pw">
                <input
                  className="input"
                  id="register-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  aria-describedby="confirm-message"
                  aria-invalid={!!errors.confirmPassword}
                  {...register("confirmPassword")}
                />
              </div>
              <p
                className={`match ${
                  confirmPassword ? (passwordsMatch ? "ok" : "bad") : ""
                }`}
                id="confirm-message"
                aria-live="polite"
              >
                {confirmPassword
                  ? passwordsMatch
                    ? "Passwords match"
                    : "Passwords do not match"
                  : ""}
              </p>
              {errors.confirmPassword && !confirmPassword && (
                <p className="text-sm text-danger" role="alert">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              className="btn btn-primary btn-block"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
            <p className="form-note">
              The first account you create becomes your company&apos;s admin.
              <br />
              By signing up you agree to our{" "}
              <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>
              . Passwords must meet our{" "}
              <Link href="/privacy#password-policy">Password Policy</Link>.
            </p>
          </form>
          <p className="auth-links">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>
        </>
      )}
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
