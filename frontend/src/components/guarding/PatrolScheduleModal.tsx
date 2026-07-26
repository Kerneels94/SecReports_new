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

interface DaySchedule {
  startTime: string;
  endTime: string;
  checkpoints: CheckpointEntry[];
  newCheckpoint: string;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export function PatrolScheduleModal({ open, onClose, sites, onSaved, editSchedule }: PatrolScheduleModalProps) {
  const [siteId, setSiteId] = useState("");
  const [daySchedules, setDaySchedules] = useState<Record<string, DaySchedule>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!editSchedule;
  const selectedDays = Object.keys(daySchedules);

  useEffect(() => {
    if (open) {
      if (editSchedule) {
        setSiteId(editSchedule.siteId);
        const cps = (editSchedule.checkpoints ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((cp) => ({ name: cp.name, order: cp.order }));
        setDaySchedules({
          [editSchedule.day]: { startTime: editSchedule.startTime, endTime: editSchedule.endTime, checkpoints: cps, newCheckpoint: "" },
        });
      } else {
        setSiteId("");
        setDaySchedules({});
      }
      setError(null);
    }
  }, [open, editSchedule]);

  const toggleDay = (day: string) => {
    setDaySchedules((prev) => {
      if (prev[day]) {
        return Object.fromEntries(Object.entries(prev).filter(([k]) => k !== day));
      }
      return { ...prev, [day]: { startTime: "08:00", endTime: "17:00", checkpoints: [], newCheckpoint: "" } };
    });
  };

  const updateDayTime = (day: string, field: "startTime" | "endTime", value: string) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const updateDayCheckpoints = (day: string, updater: (cps: CheckpointEntry[]) => CheckpointEntry[]) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: { ...prev[day], checkpoints: updater(prev[day].checkpoints) },
    }));
  };

  const updateDayCheckpoint = (day: string, value: string) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: { ...prev[day], newCheckpoint: value },
    }));
  };

  const addCheckpoint = (day: string) => {
    const name = daySchedules[day]?.newCheckpoint.trim();
    if (!name) return;
    updateDayCheckpoints(day, (prev) => [...prev, { name, order: prev.length }]);
    updateDayCheckpoint(day, "");
  };

  const removeCheckpoint = (day: string, index: number) => {
    updateDayCheckpoints(day, (prev) =>
      prev.filter((_, i) => i !== index).map((cp, i) => ({ ...cp, order: i })),
    );
  };

  const moveCheckpoint = (day: string, index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= (daySchedules[day]?.checkpoints.length ?? 0)) return;
    updateDayCheckpoints(day, (prev) => {
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
    if (selectedDays.length === 0) {
      setError("At least one day is required");
      return;
    }

    for (const day of selectedDays) {
      const { startTime, endTime } = daySchedules[day];
      if (!startTime || !endTime) {
        setError(`Start and end times are required for ${day}`);
        return;
      }
      if (startTime >= endTime) {
        setError(`End time must be after start time for ${day}`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && editSchedule) {
        const ds = daySchedules[editSchedule.day] ?? { startTime: editSchedule.startTime, endTime: editSchedule.endTime, checkpoints: [] };
        await patrolScheduleService.update(editSchedule.id, {
          siteId,
          day: editSchedule.day,
          startTime: ds.startTime,
          endTime: ds.endTime,
          checkpoints: ds.checkpoints.map((cp) => ({ name: cp.name, order: cp.order })),
        });
      } else {
        await Promise.all(
          selectedDays.map((day) => {
            const ds = daySchedules[day];
            return patrolScheduleService.create({
              siteId,
              day,
              startTime: ds.startTime,
              endTime: ds.endTime,
              checkpoints: ds.checkpoints.map((cp) => ({ name: cp.name, order: cp.order })),
            });
          }),
        );
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
          <label className="text-xs font-medium text-text-secondary">Days, Times & Checkpoints *</label>
          <div className="flex flex-col gap-3">
            {DAYS.map((d) => {
              const isSelected = d in daySchedules;
              const schedule = daySchedules[d];
              return (
                <div
                  key={d}
                  className={`rounded-lg border p-3 text-sm transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface-elevated hover:bg-surface"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleDay(d)}
                        disabled={isEditing}
                        className="rounded border-border text-primary focus:ring-primary"
                      />
                      <span className={`w-24 ${isSelected ? "text-text font-medium" : "text-text-secondary"}`}>
                        {d.charAt(0).toUpperCase() + d.slice(1)}
                      </span>
                    </label>
                    {isSelected && schedule && (
                      <div className="flex items-center gap-2 ml-auto">
                        <input
                          type="time"
                          value={schedule.startTime}
                          onChange={(e) => updateDayTime(d, "startTime", e.target.value)}
                          className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-text outline-none focus:border-primary transition-colors w-[110px]"
                        />
                        <span className="text-text-secondary">to</span>
                        <input
                          type="time"
                          value={schedule.endTime}
                          onChange={(e) => updateDayTime(d, "endTime", e.target.value)}
                          className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-text outline-none focus:border-primary transition-colors w-[110px]"
                        />
                      </div>
                    )}
                  </div>

                  {isSelected && schedule && (
                    <div className="mt-3">
                      <p className="text-xs text-text-secondary mb-2">Checkpoints</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={schedule.newCheckpoint}
                          onChange={(e) => updateDayCheckpoint(d, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCheckpoint(d);
                            }
                          }}
                          placeholder="Enter checkpoint name"
                          className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-text outline-none focus:border-primary transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => addCheckpoint(d)}
                          className="rounded-lg border border-border-light px-3 py-2 text-sm font-medium text-text hover:bg-surface-elevated transition-colors"
                        >
                          Add
                        </button>
                      </div>

                      {schedule.checkpoints.length > 0 ? (
                        <table className="w-full text-sm mt-2">
                          <thead>
                            <tr className="border-b border-border-light">
                              <th className="text-left py-2 px-3 text-text-secondary font-medium w-10">#</th>
                              <th className="text-left py-2 px-3 text-text-secondary font-medium">Name</th>
                              <th className="text-right py-2 px-3 text-text-secondary font-medium w-20">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {schedule.checkpoints.map((cp, i) => (
                              <tr key={i} className="border-b border-border-light last:border-b-0">
                                <td className="py-2 px-3 text-text-secondary">{cp.order + 1}</td>
                                <td className="py-2 px-3 text-text">{cp.name}</td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      type="button"
                                      onClick={() => moveCheckpoint(d, i, -1)}
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
                                      onClick={() => moveCheckpoint(d, i, 1)}
                                      disabled={i === schedule.checkpoints.length - 1}
                                      className="rounded p-1 text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors disabled:opacity-30"
                                      title="Move down"
                                    >
                                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 9l6 6 6-6" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeCheckpoint(d, i)}
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
                      ) : (
                        <p className="text-xs text-text-secondary mt-2">No checkpoints added yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
