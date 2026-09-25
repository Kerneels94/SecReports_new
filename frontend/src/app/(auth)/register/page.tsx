/**
 * Registration page — company sign-up with name, email, password, and confirm password.
 * @route /register
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { authService } from "@/services";

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

/** Registration page component with Zod-validated form and password match check. */
export default function RegisterPage() {
  const [registered, setRegistered] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

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

  if (registered) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-surface-secondary px-4 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.06),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(134,239,172,0.03),transparent_50%)] pointer-events-none" />
        <Card variant="elevated" className="w-full max-w-sm animate-slide-up">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-hover shadow-lg shadow-primary/25">
              <svg
                className="h-7 w-7 text-gray-900"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <CardTitle>Check Your Email</CardTitle>
            <p className="mt-1 text-sm text-text-secondary">
              {successMessage || "Account created successfully"}
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-text-secondary">
              We sent a verification link to your email. Please check your inbox
              and click the link to verify your account before logging in.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                href="/login"
                className="block w-full rounded-lg bg-primary py-2.5 text-center text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
              >
                Go to Login
              </Link>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-1.5 text-primary hover:underline transition-colors text-sm"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 12H5" />
                  <path d="M12 19l-7-7 7-7" />
                </svg>
                Back to Homepage
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-secondary px-4 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(134,239,172,0.06),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(134,239,172,0.03),transparent_50%)] pointer-events-none" />
      <Card variant="elevated" className="w-full max-w-sm animate-slide-up">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary to-primary-hover shadow-lg shadow-primary/25">
            <svg
              className="h-7 w-7 text-gray-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <CardTitle>Create Account</CardTitle>
          <p className="mt-1 text-sm text-text-secondary">
            Register your company
          </p>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            {error && (
              <div
                className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
                role="alert"
              >
                {error}
              </div>
            )}
            <Input
              label="Company Name"
              placeholder="Your Security Company"
              error={errors.companyName?.message}
              {...register("companyName")}
            />
            <Input
              label="Your Name"
              placeholder="John Doe"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="company@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              error={errors.password?.message}
              {...register("password")}
            />
            <p className="-mt-1 text-xs text-text-secondary">
              Passwords must meet our{" "}
              <Link
                href="/privacy#password-policy"
                className="text-primary hover:underline transition-colors"
              >
                Password Policy
              </Link>
              .
            </p>
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword")}
            />
            <Button type="submit" loading={isSubmitting} className="w-full">
              Create Account
            </Button>
            <p className="font-bold">
              Note: The first account created is a admin account.
            </p>
          </form>
          <p className="mt-4 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
          <div className="mt-3 text-center text-sm">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-primary hover:underline transition-colors"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
              Back to Homepage
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
