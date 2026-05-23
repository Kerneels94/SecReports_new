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
        <p className="text-sm text-danger">Admin access required.</p>
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
              <div className="rounded-lg bg-green-900/20 p-3 text-sm text-success" role="alert">
                {success}
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-900/20 p-3 text-sm text-danger" role="alert">
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
              <label htmlFor="role" className="text-sm font-medium text-text">Role</label>
              <select
                id="role"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
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
