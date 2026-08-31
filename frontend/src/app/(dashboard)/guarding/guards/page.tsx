"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { guardService, guardingSiteService } from "@/services";
import type { Guard, GuardingSite } from "@/types";

interface GuardFormData {
  name: string;
  surname: string;
  cellphone: string;
  employeeId: string;
  siteId: string;
}

const emptyForm: GuardFormData = {
  name: "",
  surname: "",
  cellphone: "",
  employeeId: "",
  siteId: "",
};

export default function GuardsPage() {
  const [guards, setGuards] = useState<Guard[]>([]);
  const [sites, setSites] = useState<GuardingSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");

  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [cellphoneValue, setCellphoneValue] = useState("");
  const [savingCellphone, setSavingCellphone] = useState(false);

  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState<GuardFormData>({ ...emptyForm });
  const [addingGuard, setAddingGuard] = useState(false);

  const fetchGuards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await guardService.list(selectedSiteId || undefined);
      setGuards(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load guards");
    } finally {
      setLoading(false);
    }
  }, [selectedSiteId]);

  const fetchSites = useCallback(async () => {
    try {
      const res = await guardingSiteService.list();
      setSites(res.data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  useEffect(() => {
    fetchGuards();
  }, [fetchGuards]);

  const openGuardModal = (guard: Guard) => {
    setSelectedGuard(guard);
    setCellphoneValue(guard.cellphone);
    setModalOpen(true);
  };

  const closeGuardModal = () => {
    setModalOpen(false);
    setSelectedGuard(null);
    setCellphoneValue("");
  };

  const handleSaveCellphone = async () => {
    if (!selectedGuard) return;
    setSavingCellphone(true);
    setError(null);
    setSuccess(null);
    try {
      await guardService.update(selectedGuard.id, { cellphone: cellphoneValue });
      setSuccess("Cellphone number updated");
      setGuards((prev) =>
        prev.map((g) =>
          g.id === selectedGuard.id ? { ...g, cellphone: cellphoneValue } : g,
        ),
      );
      setSelectedGuard((prev) =>
        prev ? { ...prev, cellphone: cellphoneValue } : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cellphone");
    } finally {
      setSavingCellphone(false);
    }
  };

  const isFormValid =
    addForm.name.trim() !== "" &&
    addForm.surname.trim() !== "" &&
    addForm.cellphone.trim() !== "" &&
    addForm.employeeId.trim() !== "";

  const handleAddGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setAddingGuard(true);
    setError(null);
    setSuccess(null);
    try {
      const payload: {
        name: string;
        surname: string;
        cellphone: string;
        employeeId: string;
        siteId?: string;
      } = {
        name: addForm.name,
        surname: addForm.surname,
        cellphone: addForm.cellphone,
        employeeId: addForm.employeeId,
      };
      if (addForm.siteId) payload.siteId = addForm.siteId;

      await guardService.create(payload);
      setSuccess("Guard added successfully");
      setAddForm({ ...emptyForm });
      setShowAddForm(false);
      await fetchGuards();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add guard");
    } finally {
      setAddingGuard(false);
    }
  };

  if (loading && guards.length === 0) {
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
          <h1 className="text-2xl font-bold text-text">Guards</h1>
          <p className="text-sm text-text-secondary mt-1">
            View and manage all security guards
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            if (!showAddForm) setAddForm({ ...emptyForm });
          }}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
        >
          {showAddForm ? "Cancel" : "Add Guard"}
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

      {showAddForm && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAddGuard} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Surname</label>
                  <input
                    type="text"
                    required
                    value={addForm.surname}
                    onChange={(e) => setAddForm({ ...addForm, surname: e.target.value })}
                    className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Cellphone</label>
                  <input
                    type="text"
                    required
                    value={addForm.cellphone}
                    onChange={(e) => setAddForm({ ...addForm, cellphone: e.target.value })}
                    className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Employee ID</label>
                  <input
                    type="text"
                    required
                    value={addForm.employeeId}
                    onChange={(e) => setAddForm({ ...addForm, employeeId: e.target.value })}
                    className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Site (optional)</label>
                  <select
                    value={addForm.siteId}
                    onChange={(e) => setAddForm({ ...addForm, siteId: e.target.value })}
                    className="w-full rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Unassigned</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingGuard || !isFormValid}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {addingGuard ? "Adding..." : "Add Guard"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-text whitespace-nowrap">
          Filter by site:
        </label>
        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Sites</option>
          {sites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
      </div>

      {guards.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">No guards found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {guards.map((guard) => (
            <Card key={guard.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">
                      {guard.name} {guard.surname}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {guard.employeeId}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {guard.cellphone}
                    </p>
                    {guard.site && (
                      <p className="text-xs text-text-secondary/60 mt-1">
                        {guard.site.name}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant={
                      guard.status === "active"
                        ? "success"
                        : guard.status === "on_leave"
                          ? "warning"
                          : "default"
                    }
                  >
                    {guard.status}
                  </Badge>
                </div>
                <div className="mt-3 pt-3 border-t border-border-light">
                  <button
                    onClick={() => openGuardModal(guard)}
                    className="text-xs text-primary hover:underline"
                  >
                    View Details
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={closeGuardModal}
        title={
          selectedGuard
            ? `${selectedGuard.name} ${selectedGuard.surname}`
            : "Guard Details"
        }
      >
        {selectedGuard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-text-secondary/70 uppercase tracking-wider">Name</p>
                <p className="text-sm text-text font-medium">
                  {selectedGuard.name} {selectedGuard.surname}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary/70 uppercase tracking-wider">Employee ID</p>
                <p className="text-sm text-text font-medium">{selectedGuard.employeeId}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary/70 uppercase tracking-wider">Status</p>
                <Badge
                  variant={
                    selectedGuard.status === "active"
                      ? "success"
                      : selectedGuard.status === "on_leave"
                        ? "warning"
                        : "default"
                  }
                >
                  {selectedGuard.status}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-text-secondary/70 uppercase tracking-wider">Site</p>
                <p className="text-sm text-text font-medium">
                  {selectedGuard.site?.name ?? "Unassigned"}
                </p>
              </div>
            </div>

            <div className="border-t border-border-light pt-4">
              <label className="block text-sm font-medium text-text mb-2">Cellphone Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cellphoneValue}
                  onChange={(e) => setCellphoneValue(e.target.value)}
                  className="flex-1 rounded-lg border border-border-light bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSaveCellphone}
                  disabled={savingCellphone || cellphoneValue === selectedGuard.cellphone}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {savingCellphone ? "Saving..." : "Update"}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={closeGuardModal}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
