"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { adminInvoiceService, adminCompanyService } from "@/services";
import type { AdminCompany } from "@/types";

const createInvoiceSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().min(1, "Due date is required"),
  description: z.string().optional(),
});

type CreateInvoiceForm = z.infer<typeof createInvoiceSchema>;

function formatCurrency(cents: number): string {
  return `R ${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function NewInvoicePage() {
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any[] | null>(null);

  useEffect(() => {
    adminCompanyService
      .list()
      .then((res) => setCompanies(res.data))
      .catch((err) =>
        setError(
          err instanceof Error ? err.message : "Failed to load companies",
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateInvoiceForm>({
    resolver: zodResolver(createInvoiceSchema),
  });

  const onSubmit = async (data: CreateInvoiceForm) => {
    try {
      setError(null);
      setSuccess(null);
      const amountInCents = Math.round(parseFloat(data.amount) * 100);
      await adminInvoiceService.create({
        companyId: data.companyId,
        amount: amountInCents,
        dueDate: data.dueDate,
        description: data.description || undefined,
      });
      setSuccess(`Invoice created successfully`);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create invoice");
    }
  };

  const handleGenerateMonthly = async () => {
    setGenerating(true);
    setGenResult(null);
    setError(null);
    try {
      const res = await adminInvoiceService.generateMonthly();
      setGenResult(res.data);
      setSuccess(`Generated ${res.data.length} monthly invoice(s)`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate invoices",
      );
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">New Invoice</h1>
        <p className="text-sm text-text-secondary mt-1">
          Create an invoice for a company or generate monthly invoices for all.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="rounded-lg bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20"
          role="alert"
        >
          {success}
        </div>
      )}

      {genResult && (
        <Card variant="bordered">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-success mb-2">
              Generated invoices:
            </p>
            <div className="flex flex-wrap gap-2">
              {genResult.map((r: any) => (
                <Badge
                  key={r.companyId}
                  variant={r.status === "sent" ? "success" : "default"}
                >
                  {r.companyName}: {r.invoiceNumber} ({r.status})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Single Invoice</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="companyId"
                  className="text-sm font-medium text-text/90"
                >
                  Company
                </label>
                <select
                  id="companyId"
                  className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                  {...register("companyId")}
                >
                  <option value="">Select a company...</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.subscription?.plan?.name || "Free"} —{" "}
                      {c.subscription?.plan
                        ? formatCurrency(c.subscription.plan.price)
                        : "R 0.00"}
                      /mo)
                    </option>
                  ))}
                </select>
                {errors.companyId && (
                  <p className="text-sm text-danger" role="alert">
                    {errors.companyId.message}
                  </p>
                )}
              </div>

              <Input
                label="Amount (in Rand)"
                type="text"
                placeholder="e.g. 1500.00"
                error={errors.amount?.message}
                {...register("amount")}
              />

              <Input
                label="Due Date"
                type="date"
                error={errors.dueDate?.message}
                {...register("dueDate")}
              />

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-text/90"
                >
                  Description (optional)
                </label>
                <textarea
                  id="description"
                  rows={3}
                  className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150 resize-none"
                  placeholder="Monthly subscription fee"
                  {...register("description")}
                />
              </div>

              <Button type="submit" loading={isSubmitting} className="w-full">
                Create Invoice
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk Generate Monthly</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">
              Generate and send invoices for the current month to all companies
              with active paid subscriptions. Skips companies that already have
              an invoice for this period.
            </p>
            <div className="rounded-lg bg-surface-elevated/30 p-4">
              <p className="text-sm font-medium text-text">
                Eligible companies:
              </p>
              <p className="text-lg font-bold text-text mt-1">
                {
                  companies.filter(
                    (c) =>
                      c.subscription?.status === "active" &&
                      (c.subscription?.plan?.price || 0) > 0,
                  ).length
                }
              </p>
              <p className="text-xs text-text-secondary/60">
                out of {companies.length} total
              </p>
            </div>
            <Button
              onClick={handleGenerateMonthly}
              loading={generating}
              variant="gradient"
              className="w-full"
            >
              Generate & Send All
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
