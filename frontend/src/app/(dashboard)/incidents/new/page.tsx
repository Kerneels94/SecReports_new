/**
 * New incident page — detailed form for creating an incident report with operator, dispatch, client, and incident fields.
 * @route /incidents/new
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { incidentService } from "@/services";

const createIncidentSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().min(1, "Description is required"),
  type: z.string().min(1, "Type is required").max(100),
  incidentDate: z.string().min(1, "Date is required"),
  operatorName: z.string().min(1, "Operator name is required").max(255),
  dispatcher: z.string().min(1, "Dispatcher is required").max(255),
  dispatchTime: z.string().optional(),
  arrivalTime: z.string().optional(),
  callSign: z.string().max(100).optional(),
  suburb: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  propertyAddress: z.string().max(500).optional(),
  clientName: z.string().max(255).optional(),
  clientCode: z.string().max(100).optional(),
  businessOrComplex: z.string().max(255).optional(),
  sapsReference: z.string().max(100).optional(),
});

type CreateIncidentForm = z.infer<typeof createIncidentSchema>;

/** New incident page component with Zod-validated form. */
export default function NewIncidentPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [typePrefix, setTypePrefix] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateIncidentForm>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      incidentDate: new Date().toLocaleDateString("en-CA"),
    },
  });

  const currentType = watch("type");

  useEffect(() => {
    const combined = [typePrefix].filter(Boolean).join(" ").trim();
    if (combined !== currentType) {
      setValue("type", combined, { shouldValidate: combined.length > 0 });
    }
  }, [typePrefix, setValue, currentType]);

  const onSubmit = async (data: CreateIncidentForm) => {
    try {
      setError(null);
      // datetime-local has no offset; convert in the browser so the server gets a UTC instant.
      await incidentService.create({
        ...data,
        dispatchTime: data.dispatchTime ? new Date(data.dispatchTime).toISOString() : undefined,
        arrivalTime: data.arrivalTime ? new Date(data.arrivalTime).toISOString() : undefined,
      });
      router.push("/incidents");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create incident",
      );
    }
  };

  return (
    <div className="mx-auto w-full max-w-[70%] min-w-160">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">Report Incident</h1>
        <p className="text-sm text-text-secondary mt-1">
          Fill in the details of the incident.
        </p>
      </div>

      <Card className="w-full">
        <CardContent className="p-8">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-6"
          >
            {error && (
              <div
                className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
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

            <div className="grid grid-cols-2 gap-6">
              <Input
                className="scheme-dark"
                label="Dispatch Time"
                type="datetime-local"
                error={errors.dispatchTime?.message}
                {...register("dispatchTime")}
              />
              <Input
                className="scheme-dark"
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

            <div className="grid grid-cols-2 gap-6">
              <Input
                label="Suburb"
                placeholder="Suburb of the incident"
                error={errors.suburb?.message}
                {...register("suburb")}
              />
              <Input
                label="City"
                placeholder="City of the incident"
                error={errors.city?.message}
                {...register("city")}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
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

            <div className="grid grid-cols-2 gap-6">
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
            <div className="grid grid-cols-3 gap-6 items-start">
              {/* Column 1: Type Field */}
              <div className="flex flex-col gap-1.5">
                {/* Label container with min-height or fixed h-5 ensures matching top spacing */}
                <label className="text-sm font-medium text-text/90 h-5 flex items-center">
                  Type
                </label>

                <select
                  aria-label="Type"
                  value={typePrefix}
                  onChange={(e) => setTypePrefix(e.target.value)}
                  className={cn(
                    "h-11 w-full rounded-xl border bg-surface/60 backdrop-blur-sm px-3.5 py-2.5 text-sm text-text transition-all duration-150 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/15",
                    typePrefix ? "border-primary/20" : "border-border-light",
                  )}
                >
                  <option value="">Select type</option>
                  <option value="Attempted">Attempted</option>
                  <option value="Positive">Positive</option>
                </select>

                {/* Error sits strictly BELOW the input without shifting the input's top position */}
                {errors.type && (
                  <p className="text-sm text-danger mt-1" role="alert">
                    {errors.type.message}
                  </p>
                )}
              </div>

              {/* Column 2: Title Field */}
              <div className="flex flex-col gap-1.5">
                {/* If using the custom Input component, wrap or ensure label height matches */}
                <Input
                  label="Title"
                  placeholder="Brief title of the incident"
                  error={errors.title?.message}
                  {...register("title")}
                />
              </div>

              {/* Column 3: Incident Date Field */}
              <div className="flex flex-col gap-1.5">
                <Input
                  className="scheme-dark"
                  label="Incident Date"
                  type="date"
                  error={errors.incidentDate?.message}
                  {...register("incidentDate")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="description"
                className="text-sm font-medium text-text/90"
              >
                Report
              </label>
              <textarea
                id="description"
                rows={5}
                placeholder="Detailed description of what happened"
                className="w-full rounded-lg border border-border-light bg-surface px-3 py-2.5 text-sm text-text placeholder:text-text-secondary/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-danger" role="alert">
                  {errors.description.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" loading={isSubmitting} size="lg">
                Submit Report
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="lg"
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
