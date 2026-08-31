"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { adminInvoiceService } from "@/services";
import type { Invoice } from "@/types";

function formatCurrency(cents: number): string {
  return `R ${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const variant =
    status === "paid"
      ? "success"
      : status === "sent"
        ? "info"
        : status === "overdue"
          ? "danger"
          : status === "draft"
            ? "warning"
            : "default";
  return <Badge variant={variant}>{status}</Badge>;
}

const statusFilters = ["all", "draft", "sent", "paid", "overdue"];

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [success, setSuccess] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params =
        statusFilter !== "all" ? { status: statusFilter } : undefined;
      const res = await adminInvoiceService.list(params);
      setInvoices(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleMarkPaid = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      await adminInvoiceService.markAsPaid(id);
      setSuccess("Invoice marked as paid");
      fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as paid");
    }
  };

  const handleSend = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      await adminInvoiceService.send(id);
      setSuccess("Invoice sent via email");
      fetchInvoices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invoice");
    }
  };

  const handleMarkOverdue = async (id: string) => {
    try {
      setError(null);
      setSuccess(null);
      await adminInvoiceService.markAsOverdue(id);
      setSuccess("Invoice marked as overdue");
      fetchInvoices();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark as overdue",
      );
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Invoices</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage and track all invoices.
          </p>
        </div>
        <Button onClick={() => (window.location.href = "/portal/invoices/new")}>
          New Invoice
        </Button>
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

      <div className="flex gap-2">
        {statusFilters.map((f) => (
          <Button
            key={f}
            variant={statusFilter === f ? "primary" : "secondary"}
            size="sm"
            onClick={() => setStatusFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : invoices.length === 0 ? (
            <p className="px-6 py-8 text-sm text-text-secondary text-center">
              No invoices found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/20">
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                      Period
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
                  {invoices.map((inv, idx) => (
                    <tr
                      key={inv.id}
                      className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors ${idx % 2 === 0 ? "bg-surface-elevated/10" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-text">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {inv.company?.name || "—"}
                      </td>
                      <td className="px-4 py-3 text-text font-medium">
                        {formatCurrency(inv.amount)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {inv.periodStart
                          ? `${formatDate(inv.periodStart)} - ${inv.periodEnd ? formatDate(inv.periodEnd) : ""}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <InvoiceStatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {inv.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSend(inv.id)}
                            >
                              Send
                            </Button>
                          )}
                          {(inv.status === "sent" ||
                            inv.status === "overdue") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkPaid(inv.id)}
                            >
                              Mark Paid
                            </Button>
                          )}
                          {inv.status === "sent" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkOverdue(inv.id)}
                            >
                              Overdue
                            </Button>
                          )}
                          {(inv.status === "draft" ||
                            inv.status === "paid") && (
                            <span className="text-xs text-text-secondary/50 px-2">
                              —
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
