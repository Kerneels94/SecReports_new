/**
 * Guarding sites page — list all guarding sites with create, view modal, and delete functionality.
 * @route /guarding/sites
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { guardingSiteService, guardService } from "@/services";
import type { GuardingSite, Guard } from "@/types";

interface GuardFormData {
  name: string;
  surname: string;
  cellphone: string;
  employeeId: string;
}

const emptyGuard: GuardFormData = {
  name: "",
  surname: "",
  cellphone: "",
  employeeId: "",
};

/** Sites page component with inline creation form, guard rows, view modal, and delete confirmation. */
export default function SitesPage() {
  const [sites, setSites] = useState<GuardingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", address: "" });
  const [guardRows, setGuardRows] = useState<GuardFormData[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // View modal
  const [viewSite, setViewSite] = useState<GuardingSite | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Edit modal
  const [editTarget, setEditTarget] = useState<GuardingSite | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", address: "" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editCurrentGuards, setEditCurrentGuards] = useState<Guard[]>([]);
  const [editGuardRows, setEditGuardRows] = useState<GuardFormData[]>([]);
  const [editGuardsToRemove, setEditGuardsToRemove] = useState<Set<string>>(new Set());
  const [editGuardsLoading, setEditGuardsLoading] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const fetchSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await guardingSiteService.list();
      setSites(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sites");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: { name: string; address?: string; guards?: GuardFormData[] } = {
        name: formData.name,
        address: formData.address || undefined,
      };
      const validGuards = guardRows.filter((g) => g.name && g.surname && g.employeeId);
      if (validGuards.length > 0) payload.guards = validGuards;

      await guardingSiteService.create(payload);
      setFormData({ name: "", address: "" });
      setGuardRows([]);
      setShowForm(false);
      await fetchSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create site");
    } finally {
      setSubmitting(false);
    }
  };

  const promptDelete = (id: string) => {
    setDeleteTarget(id);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteModalOpen(false);
    setError(null);
    setSuccess(null);
    try {
      await guardingSiteService.delete(deleteTarget);
      setDeleteTarget(null);
      setSuccess("Site deleted successfully");
      await fetchSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete site");
    }
  };

  const openViewModal = async (id: string) => {
    setViewLoading(true);
    setModalOpen(true);
    try {
      const res = await guardingSiteService.getById(id);
      setViewSite(res.data);
    } catch {
      setViewSite(null);
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewModal = () => {
    setModalOpen(false);
    setViewSite(null);
  };

  const openEditModal = async (site: GuardingSite) => {
    setEditTarget(site);
    setEditFormData({ name: site.name, address: site.address ?? "" });
    setEditGuardRows([]);
    setEditGuardsToRemove(new Set());
    setEditGuardsLoading(true);
    setEditModalOpen(true);
    try {
      const res = await guardingSiteService.getById(site.id);
      setEditCurrentGuards(res.data.guards ?? []);
    } catch {
      setEditCurrentGuards([]);
    } finally {
      setEditGuardsLoading(false);
    }
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditTarget(null);
    setEditFormData({ name: "", address: "" });
    setEditCurrentGuards([]);
    setEditGuardRows([]);
    setEditGuardsToRemove(new Set());
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: {
        name?: string;
        address?: string;
        newGuards?: GuardFormData[];
        removeGuardIds?: string[];
      } = {
        name: editFormData.name,
        address: editFormData.address || undefined,
      };

      const validNewGuards = editGuardRows.filter((g) => g.name && g.surname && g.employeeId);
      if (validNewGuards.length > 0) payload.newGuards = validNewGuards;

      const removeIds = Array.from(editGuardsToRemove);
      if (removeIds.length > 0) payload.removeGuardIds = removeIds;

      await guardingSiteService.update(editTarget.id, payload);
      setSuccess("Site updated successfully");
      closeEditModal();
      await fetchSites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update site");
    } finally {
      setEditSubmitting(false);
    }
  };

  const removeGuardFromSite = async (guard: Guard) => {
    setError(null);
    setSuccess(null);
    try {
      await guardService.update(guard.id, { siteId: null });
      setSuccess(`Guard ${guard.name} ${guard.surname} removed from site`);
      if (viewSite) {
        const res = await guardingSiteService.getById(viewSite.id);
        setViewSite(res.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove guard");
    }
  };

  const addGuardRow = () => setGuardRows([...guardRows, { ...emptyGuard }]);

  const removeGuardRow = (idx: number) => setGuardRows(guardRows.filter((_, i) => i !== idx));

  const updateGuardRow = (idx: number, field: keyof GuardFormData, value: string) => {
    const updated = [...guardRows];
    updated[idx] = { ...updated[idx], [field]: value };
    setGuardRows(updated);
  };

  const addEditGuardRow = () => setEditGuardRows([...editGuardRows, { ...emptyGuard }]);

  const removeEditGuardRow = (idx: number) => setEditGuardRows(editGuardRows.filter((_, i) => i !== idx));

  const updateEditGuardRow = (idx: number, field: keyof GuardFormData, value: string) => {
    const updated = [...editGuardRows];
    updated[idx] = { ...updated[idx], [field]: value };
    setEditGuardRows(updated);
  };

  const markGuardForRemoval = (guard: Guard) => {
    const next = new Set(editGuardsToRemove);
    next.add(guard.id);
    setEditGuardsToRemove(next);
  };

  const unmarkGuardForRemoval = (guardId: string) => {
    const next = new Set(editGuardsToRemove);
    next.delete(guardId);
    setEditGuardsToRemove(next);
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
          <h1 className="text-2xl font-bold text-text">Guarding Sites</h1>
          <p className="text-sm text-text-secondary mt-1">Manage all your guarding locations</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
        >
          {showForm ? "Cancel" : "Add Site"}
        </button>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-danger">{error}</p>
          </CardContent>
        </Card>
      )}
      {success && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-success">{success}</p>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Site Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Riverside Industrial Park"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Optional address"
                  />
                </div>
              </div>

              <div className="border-t border-border-light pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-text">Add Guards</h3>
                  <button
                    type="button"
                    onClick={addGuardRow}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add Guard
                  </button>
                </div>

                {guardRows.length === 0 && (
                  <p className="text-xs text-text-secondary">No guards added yet. You can add them now or later.</p>
                )}

                {guardRows.map((g, idx) => (
                  <div key={idx} className="rounded-lg border border-border-light p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-text-secondary">Guard {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeGuardRow(idx)}
                        className="text-xs text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        placeholder="First name"
                        required
                        value={g.name}
                        onChange={(e) => updateGuardRow(idx, "name", e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        placeholder="Surname"
                        required
                        value={g.surname}
                        onChange={(e) => updateGuardRow(idx, "surname", e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        placeholder="Cellphone"
                        required
                        value={g.cellphone}
                        onChange={(e) => updateGuardRow(idx, "cellphone", e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        placeholder="Employee ID"
                        required
                        value={g.employeeId}
                        onChange={(e) => updateGuardRow(idx, "employeeId", e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create Site"}
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">No guarding sites yet. Create your first site.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sites.map((site) => (
            <Card key={site.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{site.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{site.address || "No address"}</p>
                    <div className="flex gap-3 mt-2 text-xs text-text-secondary">
                      <span>{site._count?.guards ?? 0} guards</span>
                      <span>{site._count?.patrolReports ?? 0} patrols</span>
                      <span>{site._count?.entryLogs ?? 0} access logs</span>
                    </div>
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-semibold ${site.status === "active" ? "text-success" : "text-text-secondary"}`}>
                    {site.status}
                  </span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-border-light">
                  <button
                    onClick={() => openViewModal(site.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    View
                  </button>
                  <button
                    onClick={() => openEditModal(site)}
                    className="text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => promptDelete(site.id)}
                    className="text-xs text-danger hover:underline ml-auto"
                  >
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={closeViewModal} title={viewSite?.name || "Site Details"}>
        {viewLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : viewSite ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={viewSite.status === "active" ? "success" : "default"}>{viewSite.status}</Badge>
            </div>
            {viewSite.address && (
              <p className="text-sm text-text-secondary">{viewSite.address}</p>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-surface-elevated/50 p-3 text-center">
                <p className="text-lg font-bold text-text">{viewSite._count?.guards ?? 0}</p>
                <p className="text-[10px] text-text-secondary/70 uppercase tracking-wider">Guards</p>
              </div>
              <div className="rounded-lg bg-surface-elevated/50 p-3 text-center">
                <p className="text-lg font-bold text-text">{viewSite._count?.patrolReports ?? 0}</p>
                <p className="text-[10px] text-text-secondary/70 uppercase tracking-wider">Patrols</p>
              </div>
              <div className="rounded-lg bg-surface-elevated/50 p-3 text-center">
                <p className="text-lg font-bold text-text">{viewSite._count?.entryLogs ?? 0}</p>
                <p className="text-[10px] text-text-secondary/70 uppercase tracking-wider">Access Logs</p>
              </div>
            </div>

            {viewSite.guards && viewSite.guards.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-text mb-2">Assigned Guards</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {viewSite.guards.map((guard: Guard) => (
                    <div key={guard.id} className="flex items-center justify-between rounded-lg border border-border-light p-2.5">
                      <div>
                        <p className="text-sm text-text">{guard.name} {guard.surname}</p>
                        <p className="text-xs text-text-secondary">{guard.employeeId}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={guard.status === "active" ? "success" : guard.status === "on_leave" ? "warning" : "default"}>
                          {guard.status}
                        </Badge>
                        <button
                          onClick={() => removeGuardFromSite(guard)}
                          className="text-xs text-danger hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={closeViewModal}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary py-4">Failed to load site details.</p>
        )}
      </Modal>

      <Modal open={editModalOpen} onClose={closeEditModal} title={`Edit Site${editTarget ? ` — ${editTarget.name}` : ""}`}>
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">Site Name</label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g. Riverside Industrial Park"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">Address</label>
            <input
              type="text"
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Optional address"
            />
          </div>

          {editGuardsLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <>
              {editCurrentGuards.length > 0 && (
                <div className="border-t border-border-light pt-4">
                  <h4 className="text-sm font-semibold text-text mb-2">Current Guards</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {editCurrentGuards
                      .filter((g) => !editGuardsToRemove.has(g.id))
                      .map((guard) => (
                        <div key={guard.id} className="flex items-center justify-between rounded-lg border border-border-light p-2.5">
                          <div>
                            <p className="text-sm text-text">{guard.name} {guard.surname}</p>
                            <p className="text-xs text-text-secondary">{guard.employeeId}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => markGuardForRemoval(guard)}
                            className="text-xs text-danger hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {editGuardsToRemove.size > 0 && (
                <div className="border-t border-border-light pt-3">
                  <h4 className="text-sm font-semibold text-danger mb-2">Guards to Remove</h4>
                  <div className="space-y-1">
                    {editCurrentGuards
                      .filter((g) => editGuardsToRemove.has(g.id))
                      .map((guard) => (
                        <div key={guard.id} className="flex items-center justify-between rounded-lg bg-danger/5 border border-danger/20 p-2">
                          <p className="text-sm text-text">{guard.name} {guard.surname}</p>
                          <button
                            type="button"
                            onClick={() => unmarkGuardForRemoval(guard.id)}
                            className="text-xs text-primary hover:underline"
                          >
                            Undo
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="border-t border-border-light pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-text">Add New Guards</h4>
                  <button
                    type="button"
                    onClick={addEditGuardRow}
                    className="text-xs text-primary hover:underline"
                  >
                    + Add Guard
                  </button>
                </div>

                {editGuardRows.length === 0 && (
                  <p className="text-xs text-text-secondary">No new guards added.</p>
                )}

                {editGuardRows.map((g, idx) => (
                  <div key={idx} className="rounded-lg border border-border-light p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-text-secondary">New Guard {idx + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeEditGuardRow(idx)}
                        className="text-xs text-danger hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      <input
                        placeholder="First name"
                        required
                        value={g.name}
                        onChange={(e) => updateEditGuardRow(idx, "name", e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        placeholder="Surname"
                        required
                        value={g.surname}
                        onChange={(e) => updateEditGuardRow(idx, "surname", e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        placeholder="Cellphone"
                        required
                        value={g.cellphone}
                        onChange={(e) => updateEditGuardRow(idx, "cellphone", e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        placeholder="Employee ID"
                        required
                        value={g.employeeId}
                        onChange={(e) => updateEditGuardRow(idx, "employeeId", e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t border-border-light">
            <button
              type="button"
              onClick={closeEditModal}
              className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting || editGuardsLoading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {editSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete Site">
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete this site? This action cannot be undone.
          Guards will be unassigned, and all patrol reports and entry logs for this site will be permanently deleted.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModalOpen(false)}
            className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={confirmDelete}
            className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-colors"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
