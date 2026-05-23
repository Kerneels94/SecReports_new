"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { incidentService } from "@/services";

const createIncidentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  type: z.string().min(1, "Type is required").max(100),
  severity: z.enum(["low", "medium", "high", "critical"]),
  category: z.string().min(1, "Category is required").max(100),
  incidentDate: z.string().min(1, "Date is required"),
  location: z.string().max(255).optional(),
});

type CreateIncidentForm = z.infer<typeof createIncidentSchema>;

export default function NewIncidentPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateIncidentForm>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: { severity: "medium", incidentDate: new Date().toISOString().split("T")[0] },
  });

  const onSubmit = async (data: CreateIncidentForm) => {
    try {
      setError(null);
      await incidentService.create(data);
      router.push("/incidents");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create incident");
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Report Incident</h1>
        <p className="text-sm text-text-secondary mt-1">Fill in the details of the incident.</p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-red-900/20 p-3 text-sm text-danger" role="alert">
                {error}
              </div>
            )}

            <Input
              label="Title"
              placeholder="Brief title of the incident"
              error={errors.title?.message}
              {...register("title")}
            />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="description" className="text-sm font-medium text-text">
                Description
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Detailed description of what happened"
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-danger" role="alert">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Type"
                placeholder="e.g. equipment_failure"
                error={errors.type?.message}
                {...register("type")}
              />
              <Input
                label="Category"
                placeholder="e.g. Infrastructure"
                error={errors.category?.message}
                {...register("category")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="severity" className="text-sm font-medium text-text">
                  Severity
                </label>
                <select
                  id="severity"
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  {...register("severity")}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                {errors.severity && (
                  <p className="text-sm text-danger" role="alert">{errors.severity.message}</p>
                )}
              </div>

              <Input
                label="Incident Date"
                type="date"
                error={errors.incidentDate?.message}
                {...register("incidentDate")}
              />
            </div>

            <Input
              label="Location"
              placeholder="Where did it happen?"
              error={errors.location?.message}
              {...register("location")}
            />

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isSubmitting}>
                Submit Report
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/incidents")}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
