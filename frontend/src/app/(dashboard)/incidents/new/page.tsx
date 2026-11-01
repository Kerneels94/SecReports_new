/**
 * New incident page — detailed form for creating an incident report with operator, dispatch, client, and incident fields.
 * @route /incidents/new
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormRegister } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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

const CARD = "rounded-[18px] border border-border-light bg-surface p-6";

function SectionHeader({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <header className="flex items-start gap-3.5">
      <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-primary/25 bg-primary/[0.06] font-mono text-[13px] text-primary">
        {step}
      </span>
      <div>
        <h2 className="text-[17px] font-semibold text-text">{title}</h2>
        <p className="mt-0.5 text-sm text-text-subtle">{description}</p>
      </div>
    </header>
  );
}

function TypeOption({
  value,
  label,
  tone,
  icon,
  register,
}: {
  value: string;
  label: string;
  tone: "attempted" | "positive";
  icon: React.ReactNode;
  register: UseFormRegister<CreateIncidentForm>;
}) {
  return (
    <label className="relative cursor-pointer">
      <input
        type="radio"
        value={value}
        className="peer absolute inset-0 cursor-pointer opacity-0"
        {...register("type")}
      />
      <span className="flex items-center gap-3 rounded-xl border border-border bg-surface-secondary/85 px-4 py-3.5 font-medium text-text transition-all peer-checked:border-primary peer-checked:ring-[3px] peer-checked:ring-primary/15 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
        <span
          className={cn(
            "grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] border",
            tone === "attempted"
              ? "border-[#fcd34d]/40 bg-[#fcd34d]/[0.12] text-[#fcd34d]"
              : "border-[#fca5a5]/40 bg-[#fca5a5]/[0.12] text-[#fca5a5]",
          )}
        >
          {icon}
        </span>
        {label}
      </span>
    </label>
  );
}

/** New incident page component with Zod-validated form. */
export default function NewIncidentPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateIncidentForm>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      type: "",
      incidentDate: new Date().toLocaleDateString("en-CA"),
    },
  });

  const dispatchTime = useWatch({ control, name: "dispatchTime" });
  const arrivalTime = useWatch({ control, name: "arrivalTime" });

  let responseMinutes: number | null = null;
  if (dispatchTime && arrivalTime) {
    const diff = new Date(arrivalTime).getTime() - new Date(dispatchTime).getTime();
    if (!Number.isNaN(diff)) responseMinutes = Math.round(diff / 60000);
  }

  const responseText =
    responseMinutes === null
      ? "Add dispatch and arrival times to see the response time"
      : responseMinutes < 0
        ? "Arrival is before dispatch"
        : responseMinutes >= 60
          ? `${Math.floor(responseMinutes / 60)} h ${responseMinutes % 60} min response time`
          : `${responseMinutes} min response time`;

  const onSubmit = async (data: CreateIncidentForm) => {
    if (
      data.dispatchTime &&
      data.arrivalTime &&
      new Date(data.arrivalTime) < new Date(data.dispatchTime)
    ) {
      setError("Arrival time must be after the dispatch time.");
      return;
    }
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
    <div className="animate-fade-in w-full">
      <div className="mb-6">
        <Link
          href="/incidents"
          className="mb-2.5 inline-flex items-center gap-1.5 text-sm text-text-secondary transition-colors hover:text-text"
        >
          <svg className="h-4 w-4 rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
          Incidents
        </Link>
        <h1 className="text-[clamp(26px,2.6vw,32px)] font-bold tracking-[-0.03em] text-text">
          Report incident
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Fill in the details of the incident. A reference number is assigned when you submit.
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]"
      >
        <div className="grid gap-4">
          {error && (
            <div
              className="rounded-xl bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
              role="alert"
            >
              {error}
            </div>
          )}

          <section className={cn(CARD, "grid gap-[18px]")}>
            <SectionHeader step={1} title="Incident" description="What happened and when." />
            <fieldset className="min-w-0">
              <legend className="mb-[7px] block text-sm font-medium text-text/90">Type</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TypeOption
                  value="Attempted"
                  label="Attempted"
                  tone="attempted"
                  register={register}
                  icon={
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <path d="M12 9v4" />
                      <path d="M12 17h.01" />
                    </svg>
                  }
                />
                <TypeOption
                  value="Positive"
                  label="Positive"
                  tone="positive"
                  register={register}
                  icon={
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86L7.86 2Z" />
                      <path d="M12 8v4" />
                      <path d="M12 16h.01" />
                    </svg>
                  }
                />
              </div>
              {errors.type && (
                <p className="mt-1.5 text-sm text-danger" role="alert">
                  {errors.type.message}
                </p>
              )}
            </fieldset>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                className="bg-surface-secondary"
                label="Title"
                placeholder="Brief title of the incident"
                error={errors.title?.message}
                {...register("title")}
              />
              <Input
                className="scheme-dark bg-surface-secondary"
                label="Incident Date"
                type="date"
                error={errors.incidentDate?.message}
                {...register("incidentDate")}
              />
            </div>
          </section>

          <section className={cn(CARD, "grid gap-[18px]")}>
            <SectionHeader
              step={2}
              title="Personnel & response"
              description="Who handled it and how fast the vehicle arrived."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                className="bg-surface-secondary"
                label="Operator Name"
                placeholder="Person creating the report"
                error={errors.operatorName?.message}
                {...register("operatorName")}
              />
              <Input
                className="bg-surface-secondary"
                label="Dispatcher"
                placeholder="Person at the dispatch station"
                error={errors.dispatcher?.message}
                {...register("dispatcher")}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                className="scheme-dark bg-surface-secondary"
                label="Dispatch Time"
                type="datetime-local"
                error={errors.dispatchTime?.message}
                {...register("dispatchTime")}
              />
              <Input
                className="scheme-dark bg-surface-secondary"
                label="Arrival Time"
                type="datetime-local"
                error={errors.arrivalTime?.message}
                {...register("arrivalTime")}
              />
              <Input
                className="bg-surface-secondary font-mono"
                label="Call Sign"
                placeholder="e.g. ALPHA-3"
                error={errors.callSign?.message}
                {...register("callSign")}
              />
            </div>
          </section>

          <section className={cn(CARD, "grid gap-[18px]")}>
            <SectionHeader
              step={3}
              title="Client & property"
              description="Where it happened and who the client is."
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  className="bg-surface-secondary"
                  label="Property Address"
                  placeholder="Street address of the property"
                  error={errors.propertyAddress?.message}
                  {...register("propertyAddress")}
                />
              </div>
              <Input
                className="bg-surface-secondary"
                label="Suburb"
                placeholder="Suburb"
                error={errors.suburb?.message}
                {...register("suburb")}
              />
              <Input
                className="bg-surface-secondary"
                label="City"
                placeholder="City"
                error={errors.city?.message}
                {...register("city")}
              />
              <Input
                className="bg-surface-secondary"
                label="Client Name and Surname"
                placeholder="Client full name"
                error={errors.clientName?.message}
                {...register("clientName")}
              />
              <Input
                className="bg-surface-secondary font-mono"
                label="Client Code"
                placeholder="Client code"
                error={errors.clientCode?.message}
                {...register("clientCode")}
              />
              <Input
                className="bg-surface-secondary"
                label="Business or Complex Name"
                placeholder="Business or complex name"
                error={errors.businessOrComplex?.message}
                {...register("businessOrComplex")}
              />
              <Input
                className="bg-surface-secondary font-mono"
                label="SAPS Reference"
                placeholder="e.g. CAS 214/10/2026"
                error={errors.sapsReference?.message}
                {...register("sapsReference")}
              />
            </div>
          </section>

          <section className={cn(CARD, "grid gap-[18px]")}>
            <SectionHeader
              step={4}
              title="Report"
              description="Describe what happened in as much detail as you can."
            />
            <div>
              <label htmlFor="description" className="mb-[7px] block text-sm font-medium text-text/90">
                Report
              </label>
              <textarea
                id="description"
                rows={6}
                placeholder="Detailed description of what happened"
                className="min-h-32 w-full resize-y rounded-[10px] border border-border-light bg-surface-secondary px-3.5 py-3 text-sm text-text placeholder:text-text-subtle outline-none transition-colors hover:border-[#52525b] focus:border-primary focus:ring-[3px] focus:ring-primary/15"
                aria-invalid={!!errors.description}
                {...register("description")}
              />
              {errors.description && (
                <p className="mt-1.5 text-sm text-danger" role="alert">
                  {errors.description.message}
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-[88px]">
          <div className={cn(CARD, "grid gap-3.5")}>
            <div>
              <p className="text-xs uppercase tracking-[0.1em] text-text-subtle">Reference</p>
              <p className="mt-0.5 font-mono text-[15px] text-primary">Assigned on submit</p>
            </div>
            <p
              className={cn(
                "flex items-center gap-2 rounded-[10px] border border-border bg-surface-secondary px-3 py-3 text-sm",
                responseMinutes === null
                  ? "text-text-secondary"
                  : responseMinutes < 0
                    ? "text-[#fca5a5]"
                    : "text-primary",
              )}
            >
              <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span aria-live="polite">{responseText}</span>
            </p>
            <Button type="submit" loading={isSubmitting} className="w-full">
              Submit report
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => router.push("/incidents")}
            >
              Cancel
            </Button>
          </div>
        </aside>
      </form>
    </div>
  );
}
