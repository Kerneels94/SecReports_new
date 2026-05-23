"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { userService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  role: z.enum(["reporter", "investigator", "manager", "admin"]),
  department: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "reporter" },
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl bg-surface ring-1 ring-border-light">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-900/30 ring-1 ring-red-500/20">
            <svg className="h-5 w-5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01" /><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
          </div>
          <p className="text-sm text-danger font-medium">Admin access required.</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: CreateUserForm) => {
    try {
      setError(null);
      setSuccess(null);
      await userService.create(data);
      setSuccess(`User ${data.email} created successfully`);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Manage Users</h1>
        <p className="text-sm text-text-secondary mt-1">Create employee accounts for your company.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Employee</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {success && (
              <div className="rounded-lg bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="alert">
                {success}
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
                {error}
              </div>
            )}
            <Input
              label="Name"
              placeholder="Employee name"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="employee@example.com"
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
            <Input
              label="Department"
              placeholder="e.g. Security"
              error={errors.department?.message}
              {...register("department")}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-sm font-medium text-text/90">Role</label>
              <select
                id="role"
                className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                {...register("role")}
              >
                <option value="reporter">Reporter</option>
                <option value="investigator">Investigator</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              {errors.role && (
                <p className="text-sm text-danger" role="alert">{errors.role.message}</p>
              )}
            </div>
            <Button type="submit" loading={isSubmitting} className="w-full">
              Create User
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
