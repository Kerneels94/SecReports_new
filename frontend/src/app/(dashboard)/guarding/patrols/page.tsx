/**
 * Patrol reports page — view and filter patrol reports across all sites with site/date filters.
 * @route /guarding/patrols
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { PatrolReportExportModal } from "@/components/guarding/PatrolReportExportModal";
import { PatrolScheduleModal } from "@/components/guarding/PatrolScheduleModal";
import { patrolReportService, patrolScheduleService, guardingSiteService, guardService } from "@/services";
import type { PatrolReport, PatrolSchedule, GuardingSite, Guard } from "@/types";

/** Patrol reports page component with filters by site/date and a paginated table of patrol records. */
export default function PatrolsPage() {
  const [patrols, setPatrols] = useState<PatrolReport[]>([]);
  const [sites, setSites] = useState<GuardingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterSiteId, setFilterSiteId] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ siteId: "", guardId: "", startedAt: "", notes: "" });
  const [addGuards, setAddGuards] = useState<Guard[]>([]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editPatrol, setEditPatrol] = useState<PatrolReport | null>(null);
  const [editStatus, setEditStatus] = useState<string>("in_progress");
  const [editCompletedAt, setEditCompletedAt] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [schedules, setSchedules] = useState<PatrolSchedule[]>([]);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editSchedule, setEditSchedule] = useState<PatrolSchedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);

  const buildFilters = useCallback(() => {
    const filters: { siteId?: string; dateFrom?: string; dateTo?: string } = {};
    if (filterSiteId) filters.siteId = filterSiteId;
    if (filterDateFrom) filters.dateFrom = filterDateFrom;
    if (filterDateTo) filters.dateTo = filterDateTo;
    return filters;
  }, [filterSiteId, filterDateFrom, filterDateTo]);

  const fetchPatrols = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await patrolReportService.listByCompany(buildFilters());
      setPatrols(res.data);
    } catch {
      setError("Failed to load patrol reports");
    } finally {
      setLoading(false);
    }
  }, [buildFilters]);

  const fetchSites = useCallback(async () => {
    try {
      const res = await guardingSiteService.list();
      setSites(res.data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const fetchSchedules = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const res = await patrolScheduleService.listByCompany();
      setSchedules(res.data);
    } catch {
      // silently fail
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatrols();
  }, [fetchPatrols]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const statusVariant = (status: string) => {
    if (status === "completed") return "success" as const;
    if (status === "in_progress") return "warning" as const;
    return "default" as const;
  };

  const openAddModal = () => {
    setAddForm({ siteId: "", guardId: "", startedAt: new Date().toISOString().slice(0, 16), notes: "" });
    setAddGuards([]);
    setAddError(null);
    setAddModalOpen(true);
  };

  const closeAddModal = () => {
    setAddModalOpen(false);
    setAddError(null);
  };

  const handleSiteChange = async (siteId: string) => {
    setAddForm((prev) => ({ ...prev, siteId, guardId: "" }));
    if (!siteId) {
      setAddGuards([]);
      return;
    }
    try {
      const res = await guardService.list(siteId);
      setAddGuards(res.data.filter((g) => g.status === "active"));
    } catch {
      setAddGuards([]);
    }
  };

  const openEditModal = (patrol: PatrolReport) => {
    setEditPatrol(patrol);
    setEditStatus(patrol.status);
    setEditCompletedAt(patrol.completedAt ? new Date(patrol.completedAt).toISOString().slice(0, 16) : "");
    setEditNotes(patrol.notes ?? "");
    setEditError(null);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditPatrol(null);
    setEditError(null);
  };

  const handleEditSubmit = async () => {
    if (!editPatrol) return;
    if (!editStatus) {
      setEditError("Status is required");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      await patrolReportService.update(editPatrol.id, {
        status: editStatus,
        completedAt: editStatus === "completed" && editCompletedAt
          ? new Date(editCompletedAt).toISOString()
          : editStatus === "completed"
            ? new Date().toISOString()
            : undefined,
        notes: editNotes.trim() || undefined,
      });
      closeEditModal();
      await fetchPatrols();
    } catch {
      setEditError("Failed to update patrol report");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAddSubmit = async () => {
    if (!addForm.siteId) {
      setAddError("Site is required");
      return;
    }
    if (!addForm.guardId) {
      setAddError("Guard is required");
      return;
    }
    if (!addForm.startedAt) {
      setAddError("Start time is required");
      return;
    }

    setAddSubmitting(true);
    setAddError(null);
    try {
      await patrolReportService.create({
        siteId: addForm.siteId,
        guardId: addForm.guardId,
        startedAt: new Date(addForm.startedAt).toISOString(),
        notes: addForm.notes.trim() || undefined,
      });
      closeAddModal();
      await fetchPatrols();
    } catch {
      setAddError("Failed to create patrol report");
    } finally {
      setAddSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Patrol Reports</h1>
          <p className="text-sm text-text-secondary mt-1">View and filter patrol reports across all sites</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExportModalOpen(true)}
            disabled={patrols.length === 0}
            className="rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-text hover:bg-surface-elevated transition-colors disabled:opacity-50"
          >
            Export Report
          </button>
          <button
            onClick={() => { setEditSchedule(null); setScheduleModalOpen(true); }}
            className="rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-text hover:bg-surface-elevated transition-colors"
          >
            Patrol Schedule
          </button>
          <button
            onClick={openAddModal}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
          >
            New Patrol
          </button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-text-secondary mb-1">Site</label>
              <select
                value={filterSiteId}
                onChange={(e) => setFilterSiteId(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">All Sites</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-text-secondary mb-1">From</label>
              <input
                type="datetime-local"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-text-secondary mb-1">To</label>
              <input
                type="datetime-local"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={fetchPatrols}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => {
                setFilterSiteId("");
                setFilterDateFrom("");
                setFilterDateTo("");
              }}
              className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
            >
              Reset
            </button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-danger">{error}</p>
          </CardContent>
        </Card>
      ) : patrols.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">No patrol reports found for the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light">
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Date</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Site</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Guard</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Duration</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Checkpoints</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Status</th>
                <th className="text-left py-3 px-4 text-text-secondary font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {patrols.map((p) => {
                const start = new Date(p.startedAt);
                const end = p.completedAt ? new Date(p.completedAt) : null;
                const durationMs = end ? end.getTime() - start.getTime() : null;
                const durationStr = durationMs
                  ? `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`
                  : "In progress";

                return (
                  <tr key={p.id} className="border-b border-border-light hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-3 px-4 text-text">
                      <Link href={`/guarding/site?id=${p.siteId}`} className="hover:text-primary transition-colors">
                        {start.toLocaleDateString()}
                      </Link>
                      <p className="text-xs text-text-secondary">{start.toLocaleTimeString()}</p>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{p.site?.name}</td>
                    <td className="py-3 px-4 text-text">
                      {p.guard?.name} {p.guard?.surname}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{durationStr}</td>
                    <td className="py-3 px-4 text-text-secondary">{p._count?.checkpoints ?? 0}</td>
                    <td className="py-3 px-4">
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => openEditModal(p)}
                        className="rounded-lg p-1.5 text-text-secondary hover:text-primary hover:bg-surface-elevated transition-colors"
                        title="Edit patrol"
                      >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addModalOpen} onClose={closeAddModal} title="New Patrol Report" className="max-w-lg w-full">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Site *</label>
            <select
              value={addForm.siteId}
              onChange={(e) => handleSiteChange(e.target.value)}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
            >
              <option value="">Select a site</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Guard *</label>
            <select
              value={addForm.guardId}
              onChange={(e) => setAddForm((prev) => ({ ...prev, guardId: e.target.value }))}
              disabled={!addForm.siteId}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              <option value="">{addForm.siteId ? "Select a guard" : "Select a site first"}</option>
              {addGuards.map((g) => (
                <option key={g.id} value={g.id}>{g.name} {g.surname}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Start Time *</label>
            <input
              type="datetime-local"
              value={addForm.startedAt}
              onChange={(e) => setAddForm((prev) => ({ ...prev, startedAt: e.target.value }))}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Notes</label>
            <textarea
              value={addForm.notes}
              onChange={(e) => setAddForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes about this patrol"
              rows={3}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {addError && (
            <p className="text-xs text-danger">{addError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeAddModal}
              className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSubmit}
              disabled={addSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {addSubmitting ? "Creating..." : "Create Patrol"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={editModalOpen} onClose={closeEditModal} title="Edit Patrol Report" className="max-w-lg w-full">
        <div className="flex flex-col gap-4">
          {editPatrol && (
            <div className="rounded-lg bg-surface-elevated p-3 text-sm text-text-secondary">
              <p><span className="font-medium text-text">Site:</span> {sites.find((s) => s.id === editPatrol.siteId)?.name ?? editPatrol.siteId}</p>
              <p><span className="font-medium text-text">Guard:</span> {editPatrol.guard?.name} {editPatrol.guard?.surname}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Status *</label>
            <select
              value={editStatus}
              onChange={(e) => {
                const val = e.target.value;
                setEditStatus(val);
                if (val === "completed" && !editCompletedAt) {
                  setEditCompletedAt(new Date().toISOString().slice(0, 16));
                }
              }}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
            >
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {editStatus === "completed" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Completed At</label>
              <input
                type="datetime-local"
                value={editCompletedAt}
                onChange={(e) => setEditCompletedAt(e.target.value)}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Notes</label>
            <textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Optional notes"
              rows={3}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors resize-none"
            />
          </div>

          {editError && (
            <p className="text-xs text-danger">{editError}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={closeEditModal}
              className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={editSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {editSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </Modal>

      <PatrolReportExportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        filters={{
          siteId: filterSiteId || undefined,
          dateFrom: filterDateFrom || undefined,
          dateTo: filterDateTo || undefined,
          siteName: filterSiteId ? sites.find((s) => s.id === filterSiteId)?.name : undefined,
        }}
      />

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-text">Patrol Schedules</h2>
            <p className="text-sm text-text-secondary mt-1">Recurring patrol route templates by day and time</p>
          </div>
        </div>

        {scheduleLoading ? (
          <div className="flex items-center justify-center min-h-[120px]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : schedules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-text-secondary">No patrol schedules configured yet. Click &quot;Patrol Schedule&quot; above to create one.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-light">
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Site</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Day</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Start Time</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">End Time</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Checkpoints</th>
                  <th className="text-left py-3 px-4 text-text-secondary font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b border-border-light hover:bg-surface-elevated/30 transition-colors">
                    <td className="py-3 px-4 text-text">{s.site?.name}</td>
                    <td className="py-3 px-4 text-text capitalize">{s.day}</td>
                    <td className="py-3 px-4 text-text-secondary">{s.startTime}</td>
                    <td className="py-3 px-4 text-text-secondary">{s.endTime}</td>
                    <td className="py-3 px-4 text-text-secondary">
                      {s.checkpoints && s.checkpoints.length > 0
                        ? `${s.checkpoints.length} checkpoint${s.checkpoints.length !== 1 ? "s" : ""}`
                        : "None"}
                      {s.checkpoints && s.checkpoints.length > 0 && (
                        <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[200px]">
                          {s.checkpoints.map((cp) => cp.name).join(" → ")}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditSchedule(s); setScheduleModalOpen(true); }}
                          className="rounded-lg p-1.5 text-text-secondary hover:text-primary hover:bg-surface-elevated transition-colors"
                          title="Edit schedule"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("Delete this patrol schedule?")) return;
                            try {
                              await patrolScheduleService.delete(s.id);
                              await fetchSchedules();
                            } catch {
                              // silently fail
                            }
                          }}
                          className="rounded-lg p-1.5 text-text-secondary hover:text-danger hover:bg-surface-elevated transition-colors"
                          title="Delete schedule"
                        >
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PatrolScheduleModal
        open={scheduleModalOpen}
        onClose={() => { setScheduleModalOpen(false); setEditSchedule(null); }}
        sites={sites}
        onSaved={fetchSchedules}
        editSchedule={editSchedule}
      />
    </div>
  );
}
