"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { entryLogService, guardingSiteService } from "@/services";
import type { EntryLog, GuardingSite } from "@/types";

export default function EntryLogsPage() {
  const [entries, setEntries] = useState<EntryLog[]>([]);
  const [sites, setSites] = useState<GuardingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    siteId: "",
    driverName: "",
    driverContact: "",
    vehicleReg: "",
    vehicleDesc: "",
    entryTime: "",
    purpose: "",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryLog | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [flagError, setFlagError] = useState<string | null>(null);

  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [resolveEntry, setResolveEntry] = useState<EntryLog | null>(null);
  const [resolveReason, setResolveReason] = useState("");
  const [resolveSubmitting, setResolveSubmitting] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [entriesRes, sitesRes] = await Promise.all([
        entryLogService.listByCompany(),
        guardingSiteService.list(),
      ]);
      setEntries(entriesRes.data);
      setSites(sitesRes.data);
    } catch {
      setError("Failed to load vehicle access logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setAddForm({
      siteId: sites[0]?.id ?? "",
      driverName: "",
      driverContact: "",
      vehicleReg: "",
      vehicleDesc: "",
      entryTime: new Date().toISOString().slice(0, 16),
      purpose: "",
    });
    setAddError(null);
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setAddError(null);
  };

  const handleAddSubmit = async () => {
    if (!addForm.siteId) {
      setAddError("Site is required");
      return;
    }
    if (!addForm.driverName.trim()) {
      setAddError("Driver name is required");
      return;
    }
    if (!addForm.vehicleReg.trim()) {
      setAddError("Vehicle registration is required");
      return;
    }
    if (!addForm.entryTime) {
      setAddError("Entry time is required");
      return;
    }

    setAddSubmitting(true);
    setAddError(null);
    try {
      await entryLogService.create({
        siteId: addForm.siteId,
        driverName: addForm.driverName.trim(),
        driverContact: addForm.driverContact.trim() || undefined,
        vehicleReg: addForm.vehicleReg.trim(),
        vehicleDesc: addForm.vehicleDesc.trim() || undefined,
        entryTime: new Date(addForm.entryTime).toISOString(),
        purpose: addForm.purpose.trim() || undefined,
      });
      closeAddModal();
      await fetchData();
    } catch {
      setAddError("Failed to create entry log");
    } finally {
      setAddSubmitting(false);
    }
  };

  const openFlagModal = (entry: EntryLog) => {
    setSelectedEntry(entry);
    setReason("");
    setFlagError(null);
    setFlagModalOpen(true);
  };

  const closeFlagModal = () => {
    setFlagModalOpen(false);
    setSelectedEntry(null);
    setReason("");
    setFlagError(null);
  };

  const handleFlag = async () => {
    if (!selectedEntry) return;
    if (!reason.trim()) {
      setFlagError("Reason is required");
      return;
    }

    setSubmitting(true);
    setFlagError(null);
    try {
      await entryLogService.flag(selectedEntry.id, { reason: reason.trim() });
      closeFlagModal();
      await fetchData();
    } catch {
      setFlagError("Failed to flag vehicle. It may already be flagged.");
    } finally {
      setSubmitting(false);
    }
  };

  const openResolveModal = (entry: EntryLog) => {
    setResolveEntry(entry);
    setResolveReason("");
    setResolveError(null);
    setResolveModalOpen(true);
  };

  const closeResolveModal = () => {
    setResolveModalOpen(false);
    setResolveEntry(null);
    setResolveReason("");
    setResolveError(null);
  };

  const handleResolve = async () => {
    if (!resolveEntry) return;
    if (!resolveReason.trim()) {
      setResolveError("Reason is required");
      return;
    }

    setResolveSubmitting(true);
    setResolveError(null);
    try {
      await entryLogService.resolve(resolveEntry.id, { reason: resolveReason.trim() });
      closeResolveModal();
      await fetchData();
    } catch {
      setResolveError("Failed to unflag vehicle");
    } finally {
      setResolveSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Vehicle Access Logs</h1>
          <p className="text-sm text-text-secondary mt-1">Vehicle and visitor access records across all sites</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
          >
            Add Vehicle Log
          </button>
          <button
            onClick={fetchData}
            className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-danger">{error}</p>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">No vehicle access logs recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Vehicle</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Driver</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Site</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Entry Time</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Exit Time</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Flag Reason</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Status</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border-light hover:bg-surface-elevated/30 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-medium text-text">{e.vehicleReg}</p>
                    {e.vehicleDesc && <p className="text-xs text-text-secondary">{e.vehicleDesc}</p>}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-text">{e.driverName}</p>
                    {e.driverContact && <p className="text-xs text-text-secondary">{e.driverContact}</p>}
                  </td>
                  <td className="py-3 px-4 text-text-secondary">{e.site?.name}</td>
                  <td className="py-3 px-4 text-text-secondary">{new Date(e.entryTime).toLocaleString()}</td>
                  <td className="py-3 px-4 text-text-secondary">
                    {e.exitTime ? new Date(e.exitTime).toLocaleString() : "-"}
                  </td>
                  <td className="py-3 px-4 text-text-secondary max-w-[200px] truncate">
                    {e.flagged && e.flagReason ? e.flagReason : "\u2014"}
                  </td>
                  <td className="py-3 px-4">
                    {e.flagged && !e.resolvedAt ? (
                      <Badge variant="danger">Flagged</Badge>
                    ) : (
                      <Badge variant="success">Cleared</Badge>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {e.flagged && !e.resolvedAt ? (
                      <button
                        onClick={() => openResolveModal(e)}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                      >
                        Unflag
                      </button>
                    ) : (
                      <button
                        onClick={() => openFlagModal(e)}
                        className="rounded-lg bg-danger px-3 py-1.5 text-xs font-medium text-white hover:bg-danger/90 transition-colors"
                      >
                        Flag Vehicle
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addModalOpen} onClose={closeAddModal} title="Add Vehicle Log" className="max-w-lg w-full">
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Site *</label>
              <select
                value={addForm.siteId}
                onChange={(e) => setAddForm({ ...addForm, siteId: e.target.value })}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              >
                <option value="">Select a site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Vehicle Registration *</label>
              <input
                value={addForm.vehicleReg}
                onChange={(e) => setAddForm({ ...addForm, vehicleReg: e.target.value })}
                placeholder="e.g. AB 123 CD"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Driver Name *</label>
              <input
                value={addForm.driverName}
                onChange={(e) => setAddForm({ ...addForm, driverName: e.target.value })}
                placeholder="Full name"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Driver Contact</label>
              <input
                value={addForm.driverContact}
                onChange={(e) => setAddForm({ ...addForm, driverContact: e.target.value })}
                placeholder="Phone number"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Vehicle Description</label>
              <input
                value={addForm.vehicleDesc}
                onChange={(e) => setAddForm({ ...addForm, vehicleDesc: e.target.value })}
                placeholder="e.g. White Toyota Hilux"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Entry Time *</label>
              <input
                type="datetime-local"
                value={addForm.entryTime}
                onChange={(e) => setAddForm({ ...addForm, entryTime: e.target.value })}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Purpose</label>
            <textarea
              value={addForm.purpose}
              onChange={(e) => setAddForm({ ...addForm, purpose: e.target.value })}
              placeholder="Reason for visit"
              rows={2}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {addError && (
            <p className="text-xs text-danger">{addError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeAddModal}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAddSubmit} disabled={addSubmitting}>
              {addSubmitting ? "Saving..." : "Add Entry Log"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={flagModalOpen} onClose={closeFlagModal} title="Flag Vehicle" className="max-w-md w-full">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Flag <span className="font-semibold text-text">{selectedEntry?.vehicleReg}</span> as suspicious. This will be visible to your entire company.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this vehicle suspicious?"
              rows={3}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {flagError && (
            <p className="text-xs text-danger">{flagError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeFlagModal}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleFlag} disabled={submitting}>
              {submitting ? "Flagging..." : "Flag Vehicle"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={resolveModalOpen} onClose={closeResolveModal} title="Unflag Vehicle" className="max-w-md w-full">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">
            Unflag <span className="font-semibold text-text">{resolveEntry?.vehicleReg}</span>. Provide a reason for resolving this flag.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Reason</label>
            <textarea
              value={resolveReason}
              onChange={(e) => setResolveReason(e.target.value)}
              placeholder="Why is this flag being resolved?"
              rows={3}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {resolveError && (
            <p className="text-xs text-danger">{resolveError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={closeResolveModal}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleResolve} disabled={resolveSubmitting}>
              {resolveSubmitting ? "Unflagging..." : "Unflag Vehicle"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
