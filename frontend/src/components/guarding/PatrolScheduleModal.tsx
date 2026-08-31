"use client";

/**
 * PatrolScheduleModal — form dialog for creating or editing a patrol schedule
 * with per-day time-slot and checkpoint management.
 */

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { patrolScheduleService } from "@/services";
import type { GuardingSite, PatrolSchedule } from "@/types";

interface CheckpointEntry {
  name: string;
  order: number;
}

interface SlotEntry {
  startTime: string;
  endTime: string;
  checkpoints: CheckpointEntry[];
  newCheckpoint: string;
}

interface DaySchedule {
  timeSlots: SlotEntry[];
}

interface PatrolScheduleModalProps {
  open: boolean;
  onClose: () => void;
  sites: GuardingSite[];
  onSaved: () => void;
  editSchedule?: PatrolSchedule | null;
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

const emptySlot = (): SlotEntry => ({ startTime: "08:00", endTime: "09:00", checkpoints: [], newCheckpoint: "" });

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
        const slots: SlotEntry[] = (editSchedule.timeSlots ?? [])
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((ts) => ({
            startTime: ts.startTime,
            endTime: ts.endTime,
            checkpoints: (ts.checkpoints ?? [])
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((cp) => ({ name: cp.name, order: cp.order })),
            newCheckpoint: "",
          }));
        setDaySchedules({
          [editSchedule.day]: { timeSlots: slots.length > 0 ? slots : [emptySlot()] },
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
      return { ...prev, [day]: { timeSlots: [emptySlot()] } };
    });
  };

  const addTimeSlot = (day: string) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        timeSlots: [...(prev[day]?.timeSlots ?? []), emptySlot()],
      },
    }));
  };

  const removeTimeSlot = (day: string, slotIndex: number) => {
    setDaySchedules((prev) => {
      const slots = prev[day]?.timeSlots.filter((_, i) => i !== slotIndex) ?? [];
      if (slots.length === 0) return prev;
      return { ...prev, [day]: { timeSlots: slots } };
    });
  };

  const updateSlotTime = (day: string, slotIndex: number, field: "startTime" | "endTime", value: string) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        timeSlots: prev[day].timeSlots.map((s, i) => (i === slotIndex ? { ...s, [field]: value } : s)),
      },
    }));
  };

  const addCheckpoint = (day: string, slotIndex: number) => {
    const slot = daySchedules[day]?.timeSlots[slotIndex];
    const name = slot?.newCheckpoint.trim();
    if (!name) return;
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        timeSlots: prev[day].timeSlots.map((s, i) =>
          i === slotIndex
            ? { ...s, checkpoints: [...s.checkpoints, { name, order: s.checkpoints.length }], newCheckpoint: "" }
            : s,
        ),
      },
    }));
  };

  const removeCheckpoint = (day: string, slotIndex: number, cpIndex: number) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        timeSlots: prev[day].timeSlots.map((s, i) =>
          i === slotIndex
            ? { ...s, checkpoints: s.checkpoints.filter((_, ci) => ci !== cpIndex).map((cp, ci) => ({ ...cp, order: ci })) }
            : s,
        ),
      },
    }));
  };

  const moveCheckpoint = (day: string, slotIndex: number, cpIndex: number, direction: -1 | 1) => {
    const newIdx = cpIndex + direction;
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        timeSlots: prev[day].timeSlots.map((s, i) => {
          if (i !== slotIndex) return s;
          const updated = [...s.checkpoints];
          const item = updated[cpIndex];
          updated[cpIndex] = updated[newIdx];
          updated[newIdx] = item;
          return { ...s, checkpoints: updated.map((cp, ci) => ({ ...cp, order: ci })) };
        }),
      },
    }));
  };

  const updateNewCheckpoint = (day: string, slotIndex: number, value: string) => {
    setDaySchedules((prev) => ({
      ...prev,
      [day]: {
        timeSlots: prev[day].timeSlots.map((s, i) => (i === slotIndex ? { ...s, newCheckpoint: value } : s)),
      },
    }));
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
      const { timeSlots } = daySchedules[day];
      if (timeSlots.length === 0) {
        setError(`At least one time slot is required for ${day}`);
        return;
      }
      for (let i = 0; i < timeSlots.length; i++) {
        const { startTime, endTime } = timeSlots[i];
        if (!startTime || !endTime) {
          setError(`Start and end times are required for ${day} slot ${i + 1}`);
          return;
        }
        if (startTime >= endTime) {
          setError(`End time must be after start time for ${day} slot ${i + 1}`);
          return;
        }
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      if (isEditing && editSchedule) {
        const ds = daySchedules[editSchedule.day];
        await patrolScheduleService.update(editSchedule.id, {
          siteId,
          day: editSchedule.day,
          timeSlots: (ds?.timeSlots ?? [emptySlot()]).map((s, idx) => ({
            startTime: s.startTime,
            endTime: s.endTime,
            order: idx,
            checkpoints: s.checkpoints.map((cp) => ({ name: cp.name, order: cp.order })),
          })),
        });
      } else {
        for (const day of selectedDays) {
          const ds = daySchedules[day];
          await patrolScheduleService.create({
            siteId,
            day,
            timeSlots: ds.timeSlots.map((s, idx) => ({
              startTime: s.startTime,
              endTime: s.endTime,
              order: idx,
              checkpoints: s.checkpoints.map((cp) => ({ name: cp.name, order: cp.order })),
            })),
          });
        }
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
      className="max-w-2xl w-full max-h-[85vh] overflow-y-auto"
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
          <label className="text-xs font-medium text-text-secondary">Days, Time Slots & Checkpoints *</label>
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
                  </div>

                  {isSelected && schedule && (
                    <div className="mt-3 flex flex-col gap-3">
                      {schedule.timeSlots.map((slot, slotIdx) => (
                        <div key={slotIdx} className="rounded-lg border border-border-light bg-surface/50 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-text-secondary">Slot {slotIdx + 1}</span>
                            <div className="flex items-center gap-2 ml-auto">
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => updateSlotTime(d, slotIdx, "startTime", e.target.value)}
                                className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-text outline-none focus:border-primary transition-colors w-[110px]"
                              />
                              <span className="text-text-secondary">to</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => updateSlotTime(d, slotIdx, "endTime", e.target.value)}
                                className="rounded-lg border border-border bg-surface-elevated px-2 py-1 text-xs text-text outline-none focus:border-primary transition-colors w-[110px]"
                              />
                              {schedule.timeSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeTimeSlot(d, slotIdx)}
                                  className="rounded p-1 text-text-secondary hover:text-danger hover:bg-surface-elevated transition-colors ml-1"
                                  title="Remove time slot"
                                >
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="mt-2">
                            <p className="text-xs text-text-secondary mb-1">Checkpoints</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={slot.newCheckpoint}
                                onChange={(e) => updateNewCheckpoint(d, slotIdx, e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addCheckpoint(d, slotIdx);
                                  }
                                }}
                                placeholder="Enter checkpoint name"
                                className="flex-1 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm text-text outline-none focus:border-primary transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => addCheckpoint(d, slotIdx)}
                                className="rounded-lg border border-border-light px-3 py-1.5 text-sm font-medium text-text hover:bg-surface-elevated transition-colors"
                              >
                                Add
                              </button>
                            </div>

                            {slot.checkpoints.length > 0 ? (
                              <table className="w-full text-sm mt-2">
                                <thead>
                                  <tr className="border-b border-border-light">
                                    <th className="text-left py-1.5 px-2 text-text-secondary font-medium w-8">#</th>
                                    <th className="text-left py-1.5 px-2 text-text-secondary font-medium">Name</th>
                                    <th className="text-right py-1.5 px-2 text-text-secondary font-medium w-20">Actions</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {slot.checkpoints.map((cp, cpIdx) => (
                                    <tr key={cpIdx} className="border-b border-border-light last:border-b-0">
                                      <td className="py-1.5 px-2 text-text-secondary">{cp.order + 1}</td>
                                      <td className="py-1.5 px-2 text-text">{cp.name}</td>
                                      <td className="py-1.5 px-2">
                                        <div className="flex items-center justify-end gap-1">
                                          <button
                                            type="button"
                                            onClick={() => moveCheckpoint(d, slotIdx, cpIdx, -1)}
                                            disabled={cpIdx === 0}
                                            className="rounded p-1 text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors disabled:opacity-30"
                                            title="Move up"
                                          >
                                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M18 15l-6-6-6 6" />
                                            </svg>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => moveCheckpoint(d, slotIdx, cpIdx, 1)}
                                            disabled={cpIdx === slot.checkpoints.length - 1}
                                            className="rounded p-1 text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors disabled:opacity-30"
                                            title="Move down"
                                          >
                                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                              <path d="M6 9l6 6 6-6" />
                                            </svg>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => removeCheckpoint(d, slotIdx, cpIdx)}
                                            className="rounded p-1 text-text-secondary hover:text-danger hover:bg-surface-elevated transition-colors"
                                            title="Remove"
                                          >
                                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                              <p className="text-xs text-text-secondary mt-1.5">No checkpoints added yet.</p>
                            )}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addTimeSlot(d)}
                        className="rounded-lg border border-dashed border-border-light px-3 py-2 text-xs font-medium text-text-secondary hover:text-text hover:bg-surface-elevated transition-colors"
                      >
                        + Add Time Slot
                      </button>
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
