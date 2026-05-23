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

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"company" | "employee">("company");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setError(null);
      await login(data);
      router.push("/dashboard");
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
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg shadow-primary/25">
            <svg className="h-7 w-7 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <CardTitle>Welcome Back</CardTitle>
          <p className="mt-1 text-sm text-text-secondary">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex rounded-xl bg-surface-elevated/40 p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${tab === "company" ? "bg-primary text-gray-900 shadow-sm" : "text-text-secondary hover:text-text"}`}
              onClick={() => setTab("company")}
            >
              Company
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${tab === "employee" ? "bg-primary text-gray-900 shadow-sm" : "text-text-secondary hover:text-text"}`}
              onClick={() => setTab("employee")}
            >
              Employee
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
                {error}
              </div>
            )}
            <Input
              label="Email"
              type="email"
              placeholder={tab === "company" ? "company@example.com" : "you@example.com"}
              error={errors.email?.message}
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
              {tab === "company" ? "Sign In as Company" : "Sign In as Employee"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-text-secondary">
            <a href="/forgot-password" className="text-primary hover:underline transition-colors">
              Forgot password?
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
