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
  incidentDate: z.string().min(1, "Date is required"),
  location: z.string().max(255).optional(),
  operatorName: z.string().min(1, "Operator name is required").max(255),
  dispatcher: z.string().min(1, "Dispatcher is required").max(255),
  dispatchTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  callSign: z.string().max(100).optional(),
  propertyAddress: z.string().max(500).optional(),
  clientName: z.string().max(255).optional(),
  clientCode: z.string().max(100).optional(),
  businessOrComplex: z.string().max(255).optional(),
  sapsReference: z.string().max(100).optional(),
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
    defaultValues: {
      severity: "medium",
      incidentDate: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (data: CreateIncidentForm) => {
    try {
      setError(null);
      await incidentService.create(data);
      router.push("/incidents");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create incident",
      );
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Report Incident</h1>
        <p className="text-sm text-text-secondary mt-1">
          Fill in the details of the incident.
        </p>
      </div>

      <Card>
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

            <h3 className="text-sm font-semibold text-text-secondary/80 uppercase tracking-wider pt-2">
              Personnel
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Operator Name"
                placeholder="Person creating the report"
                error={errors.operatorName?.message}
                {...register("operatorName")}
              />
              <Input
                label="Dispatcher"
                placeholder="Person at dispatch station"
                error={errors.dispatcher?.message}
                {...register("dispatcher")}
              />
            </div>

            <h3 className="text-sm font-semibold text-text-secondary/80 uppercase tracking-wider pt-2">
              Response Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Dispatch Time"
                type="datetime-local"
                error={errors.dispatchTime?.message}
                {...register("dispatchTime")}
              />
              <Input
                label="Arrival Time"
                type="datetime-local"
                error={errors.arrivalTime?.message}
                {...register("arrivalTime")}
              />
            </div>

            <Input
              label="Call Sign"
              placeholder="Call sign of the armed response vehicle"
              error={errors.callSign?.message}
              {...register("callSign")}
            />

            <h3 className="text-sm font-semibold text-text-secondary/80 uppercase tracking-wider pt-2">
              Client &amp; Property
            </h3>

            <Input
              label="Property Address"
              placeholder="Address of the property"
              error={errors.propertyAddress?.message}
              {...register("propertyAddress")}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Client Name and Surname"
                placeholder="Client full name"
                error={errors.clientName?.message}
                {...register("clientName")}
              />
              <Input
                label="Client Code"
                placeholder="Client code"
                error={errors.clientCode?.message}
                {...register("clientCode")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Business or Complex Name"
                placeholder="Business or complex name"
                error={errors.businessOrComplex?.message}
                {...register("businessOrComplex")}
              />
              <Input
                label="SAPS Reference"
                placeholder="SAPS reference number"
                error={errors.sapsReference?.message}
                {...register("sapsReference")}
              />
            </div>

            <h3 className="text-sm font-semibold text-text-secondary/80 uppercase tracking-wider pt-2">
              Incident
            </h3>

            <Input
              label="Title"
              placeholder="Brief title of the incident"
              error={errors.title?.message}
              {...register("title")}
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="description"
                className="text-sm font-medium text-text/90"
              >
                Report
              </label>
              <textarea
                id="description"
                rows={4}
                placeholder="Detailed description of what happened"
                className="rounded-lg border bg-surface-elevated/40 px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/60 transition-all duration-150 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 focus:bg-surface-elevated/60"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-danger" role="alert">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Type"
                placeholder="e.g. Attempted house break in"
                error={errors.type?.message}
                {...register("type")}
              />

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="severity"
                  className="text-sm font-medium text-text/90"
                >
                  Severity
                </label>
                <select
                  id="severity"
                  className="rounded-lg border bg-surface-elevated/40 px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                  {...register("severity")}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                {errors.severity && (
                  <p className="text-sm text-danger" role="alert">
                    {errors.severity.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Incident Date"
                type="date"
                error={errors.incidentDate?.message}
                {...register("incidentDate")}
              />
              <Input
                label="Location"
                placeholder="Where did it happen?"
                error={errors.location?.message}
                {...register("location")}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isSubmitting}>
                Submit Report
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/incidents")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
