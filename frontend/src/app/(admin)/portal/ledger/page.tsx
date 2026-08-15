"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { adminLedgerService, adminCompanyService } from "@/services";
import type { LedgerEntry, LedgerSummary, AdminCompany } from "@/types";

const ENTRY_TYPES = ["invoice", "payment", "refund", "adjustment", "credit"] as const;

const createEntrySchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  entryType: z.string().min(1, "Type is required"),
  amount: z.string().min(1, "Amount is required"),
  reference: z.string().optional(),
  description: z.string().optional(),
});

type CreateEntryForm = z.infer<typeof createEntrySchema>;

function formatCurrency(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}R ${(Math.abs(cents) / 100).toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function entryBadgeVariant(type: string): "info" | "success" | "warning" | "default" {
  switch (type) {
    case "payment":
      return "success";
    case "credit":
      return "success";
    case "invoice":
      return "info";
    case "refund":
      return "warning";
    default:
      return "default";
  }
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: "danger" | "success" }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs text-text-secondary/70 uppercase tracking-wider font-semibold">
          {label}
        </p>
        <p
          className={`text-2xl font-bold mt-1 ${
            accent === "danger"
              ? "text-danger"
              : accent === "success"
                ? "text-success"
                : "text-text"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminLedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [voidTarget, setVoidTarget] = useState<LedgerEntry | null>(null);
  const [voiding, setVoiding] = useState(false);

  const buildParams = useCallback((): {
    entryType?: string;
    status?: string;
    companyId?: string;
  } => {
    const params: { entryType?: string; status?: string; companyId?: string } = {};
    if (typeFilter !== "all") params.entryType = typeFilter;
    if (statusFilter !== "all") params.status = statusFilter;
    if (companyFilter !== "all") params.companyId = companyFilter;
    return params;
  }, [typeFilter, statusFilter, companyFilter]);

  const fetchData = async () => {
    try {
      const [entriesRes, summaryRes] = await Promise.all([
        adminLedgerService.list(buildParams()),
        adminLedgerService.summary(),
      ]);
      setEntries(entriesRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      adminLedgerService.list(buildParams()),
      adminLedgerService.summary(),
    ])
      .then(([entriesRes, summaryRes]) => {
        setEntries(entriesRes.data);
        setSummary(summaryRes.data);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load ledger"),
      )
      .finally(() => setLoading(false));
  }, [typeFilter, statusFilter, companyFilter, buildParams]);

  useEffect(() => {
    adminCompanyService
      .list()
      .then((res) => setCompanies(res.data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load companies"),
      );
  }, []);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateEntryForm>({
    resolver: zodResolver(createEntrySchema),
  });

  const onSubmit = async (data: CreateEntryForm) => {
    try {
      setError(null);
      setSuccess(null);
      const amount = Math.round(parseFloat(data.amount) * 100);
      await adminLedgerService.create({
        companyId: data.companyId,
        entryType: data.entryType,
        amount,
        reference: data.reference || undefined,
        description: data.description || undefined,
      });
      setSuccess("Ledger entry posted");
      setShowModal(false);
      reset();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create entry");
    }
  };

  const handleVoid = async (id: string) => {
    setVoiding(true);
    setError(null);
    try {
      await adminLedgerService.voidEntry(id);
      setSuccess("Ledger entry voided");
      setVoidTarget(null);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to void entry");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Ledger</h1>
          <p className="text-sm text-text-secondary mt-1">
            Financial transactions across all companies.
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>New Entry</Button>
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

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Net Balance"
            value={formatCurrency(summary.netBalance)}
            accent={summary.netBalance < 0 ? "danger" : "success"}
          />
          <SummaryCard
            label="Total In"
            value={formatCurrency(summary.totalIn)}
            accent="success"
          />
          <SummaryCard
            label="Total Out"
            value={formatCurrency(-summary.totalOut)}
            accent="danger"
          />
          <SummaryCard label="Posted Entries" value={String(summary.entryCount)} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <select
          value={typeFilter}
          onChange={(e) => {
            setLoading(true);
            setTypeFilter(e.target.value);
          }}
          className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          {ENTRY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => {
            setLoading(true);
            setStatusFilter(e.target.value);
          }}
          className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="posted">Posted</option>
          <option value="void">Void</option>
        </select>
        <select
          value={companyFilter}
          onChange={(e) => {
            setLoading(true);
            setCompanyFilter(e.target.value);
          }}
          className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
          aria-label="Filter by company"
        >
          <option value="all">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <p className="px-6 py-8 text-sm text-text-secondary text-center">
              No ledger entries found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/20">
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, idx) => (
                    <tr
                      key={entry.id}
                      className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors ${
                        idx % 2 === 0 ? "bg-surface-elevated/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(entry.postedAt)}
                      </td>
                      <td className="px-4 py-3 font-medium text-text">
                        {entry.company?.name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={entryBadgeVariant(entry.entryType)}>
                          {entry.entryType}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {entry.reference || "—"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-xs truncate">
                        {entry.description || "—"}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          entry.amount < 0 ? "text-danger" : "text-success"
                        }`}
                      >
                        {entry.amount < 0 ? "-" : "+"}
                        {formatCurrency(Math.abs(entry.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={entry.status === "void" ? "default" : "success"}
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {entry.status === "posted" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVoidTarget(entry)}
                          >
                            Void
                          </Button>
                        ) : (
                          <span className="text-xs text-text-secondary/50">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="New Ledger Entry"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="companyId" className="text-sm font-medium text-text/90">
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
                  {c.name}
                </option>
              ))}
            </select>
            {errors.companyId && (
              <p className="text-sm text-danger" role="alert">
                {errors.companyId.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="entryType" className="text-sm font-medium text-text/90">
              Type
            </label>
            <select
              id="entryType"
              className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
              {...register("entryType")}
            >
              <option value="">Select a type...</option>
              {ENTRY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
            {errors.entryType && (
              <p className="text-sm text-danger" role="alert">
                {errors.entryType.message}
              </p>
            )}
          </div>

          <Input
            label="Amount (in Rand, use − for money out)"
            type="text"
            placeholder="e.g. 1500.00 or -500.00"
            error={errors.amount?.message}
            {...register("amount")}
          />

          <Input
            label="Reference (optional)"
            type="text"
            placeholder="e.g. REF-2026-001"
            error={errors.reference?.message}
            {...register("reference")}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-medium text-text/90">
              Description (optional)
            </label>
            <textarea
              id="description"
              rows={2}
              className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150 resize-none"
              placeholder="Reason for this entry"
              {...register("description")}
            />
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            Post Entry
          </Button>
        </form>
      </Modal>

      <Modal
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        title="Void Ledger Entry"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Void{" "}
            {voidTarget
              ? `${voidTarget.entryType} entry for ${voidTarget.company?.name || "this company"} (${formatCurrency(Math.abs(voidTarget.amount))})`
              : ""}
            ? The entry will be excluded from totals. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setVoidTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={voiding}
              onClick={() => voidTarget && handleVoid(voidTarget.id)}
            >
              Void Entry
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
