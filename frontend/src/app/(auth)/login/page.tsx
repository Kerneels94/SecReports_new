/**
 * Login page — supports both company and senior sign-in with tabbed form.
 * @route /login
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

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
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <CardTitle>Welcome Back</CardTitle>
          <p className="mt-1 text-sm text-text-secondary">
            Sign in to your account
          </p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex rounded-xl bg-surface-elevated/40 p-1">
            <button
              type="button"
              className={`cursor-pointer flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${tab === "company" ? "bg-primary text-gray-900 shadow-sm" : "text-text-secondary hover:text-text"}`}
              onClick={() => setTab("company")}
            >
              Admin/Manager
            </button>
            <button
              type="button"
              className={`cursor-pointer flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${tab === "senior" ? "bg-primary text-gray-900 shadow-sm" : "text-text-secondary hover:text-text"}`}
              onClick={() => setTab("senior")}
            >
              Senior
            </button>
          </div>

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
              label="Email"
              type="email"
              placeholder={isCompany ? "company@example.com" : "you@example.com"}
              error={(errors as any).email?.message}
              {...register("email")}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" loading={isSubmitting} className="w-full">
              {isCompany ? "Sign In as Admin/Manager" : "Sign In as Senior"}
            </Button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-3 text-sm text-text-secondary">
            <a
              href="/forgot-password"
              className="cursor-pointer text-primary hover:underline transition-colors"
            >
              Forgot password?
            </a>
            <span className="text-border-light">|</span>
            <a
              href="/"
              className="cursor-pointer text-primary hover:underline transition-colors"
            >
              Back to Homepage
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
