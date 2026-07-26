"use client";

/**
 * PatrolScheduleModal — form dialog for creating or editing a patrol schedule
 * with checkpoint management.
 */

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { patrolScheduleService } from "@/services";
import type { GuardingSite, PatrolSchedule } from "@/types";

interface CheckpointEntry {
  name: string;
  order: number;
}

interface PatrolScheduleModalProps {
  open: boolean;
  onClose: () => void;
  sites: GuardingSite[];
  onSaved: () => void;
  editSchedule?: PatrolSchedule | null;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export function PatrolScheduleModal({ open, onClose, sites, onSaved, editSchedule }: PatrolScheduleModalProps) {
  const [siteId, setSiteId] = useState("");
  const [day, setDay] = useState<string>("monday");
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("17:00");
  const [checkpoints, setCheckpoints] = useState<CheckpointEntry[]>([]);
  const [newCheckpointName, setNewCheckpointName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editSchedule;

  useEffect(() => {
    if (open) {
      if (editSchedule) {
        setSiteId(editSchedule.siteId);
        setDay(editSchedule.day);
        setStartTime(editSchedule.startTime);
        setEndTime(editSchedule.endTime);
        setCheckpoints(
          (editSchedule.checkpoints ?? [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((cp) => ({ name: cp.name, order: cp.order })),
        );
      } else {
        setSiteId("");
        setDay("monday");
        setStartTime("08:00");
        setEndTime("17:00");
        setCheckpoints([]);
      }
      setNewCheckpointName("");
      setError(null);
    }
  }, [open, editSchedule]);

  const addCheckpoint = () => {
    const name = newCheckpointName.trim();
    if (!name) return;
    setCheckpoints((prev) => [...prev, { name, order: prev.length }]);
    setNewCheckpointName("");
  };

  const removeCheckpoint = (index: number) => {
    setCheckpoints((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((cp, i) => ({ ...cp, order: i })),
    );
  };

  const moveCheckpoint = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= checkpoints.length) return;
    setCheckpoints((prev) => {
      const updated = [...prev];
      const item = updated[index];
      updated[index] = updated[newIndex];
      updated[newIndex] = item;
      return updated.map((cp, i) => ({ ...cp, order: i }));
    });
  };

  const handleSubmit = async () => {
    if (!siteId) {
      setError("Site is required");
      return;
    }
    if (!day) {
      setError("Day is required");
      return;
    }
    if (!startTime || !endTime) {
      setError("Start and end times are required");
      return;
    }
    if (startTime >= endTime) {
      setError("End time must be after start time");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        siteId,
        day,
        startTime,
        endTime,
        checkpoints: checkpoints.map((cp) => ({ name: cp.name, order: cp.order })),
      };

      if (isEditing && editSchedule) {
        await patrolScheduleService.update(editSchedule.id, payload);
      } else {
        await patrolScheduleService.create(payload);
      }
      onSaved();
      onClose();
    } catch {
      setError(isEditing ? "Failed to update schedule" : "Failed to create schedule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Patrol Schedule" : "New Patrol Schedule"}
      className="max-w-lg w-full max-h-[85vh] overflow-y-auto"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Site *</label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
          >
            <option value="">Select a site</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Day *</label>
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
          >
            {DAYS.map((d) => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">Start Time *</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-secondary">End Time *</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-secondary">Patrol Checkpoints</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCheckpointName}
              onChange={(e) => setNewCheckpointName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCheckpoint();
                }
              }}
              placeholder="Enter checkpoint name"
              className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
            />
            <button
              type="button"
              onClick={addCheckpoint}
              className="rounded-lg border border-border-light px-3 py-2 text-sm font-medium text-text hover:bg-surface-elevated transition-colors"
            >
              Add
            </button>
          </div>

          {checkpoints.length > 0 && (
            <div className="mt-2 rounded-lg border border-border-light overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/50">
                    <th className="text-left py-2 px-3 text-text-secondary font-medium w-10">#</th>
                    <th className="text-left py-2 px-3 text-text-secondary font-medium">Name</th>
                    <th className="text-right py-2 px-3 text-text-secondary font-medium w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {checkpoints.map((cp, i) => (
                    <tr key={i} className="border-b border-border-light last:border-b-0">
                      <td className="py-2 px-3 text-text-secondary">{cp.order + 1}</td>
                      <td className="py-2 px-3 text-text">{cp.name}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => moveCheckpoint(i, -1)}
                            disabled={i === 0}
                            className="rounded p-1 text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors disabled:opacity-30"
                            title="Move up"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 15l-6-6-6 6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveCheckpoint(i, 1)}
                            disabled={i === checkpoints.length - 1}
                            className="rounded p-1 text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors disabled:opacity-30"
                            title="Move down"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeCheckpoint(i)}
                            className="rounded p-1 text-text-secondary hover:text-danger hover:bg-surface-elevated transition-colors"
                            title="Remove"
                          >
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
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
          {checkpoints.length === 0 && (
            <p className="text-xs text-text-secondary mt-1">No checkpoints added yet. Add checkpoint names above.</p>
          )}
        </div>

        {error && (
          <p className="text-xs text-danger">{error}</p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border-light px-4 py-2 text-sm text-text hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-gray-900 hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {submitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Schedule")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
