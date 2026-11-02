/**
 * Permissions page — role × permission matrix toggling for a company admin.
 * Each switch grants (on) or revokes (off) a permission for a role. Changes
 * are persisted via PUT /admin/permissions and enforced server-side.
 * @route /admin/permissions
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { permissionsService, type PermissionMatrix } from "@/services";
import { useAuth } from "@/hooks/useAuth";

const PANEL = "rounded-[18px] border border-border-light bg-surface";
const TH =
  "px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.09em] text-text-secondary/70 whitespace-nowrap";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  senior: "Senior",
};

/** Snapshot used to detect unsaved changes. */
function snapshot(matrix: PermissionMatrix): string {
  return JSON.stringify({
    roles: matrix.roles,
    permissions: matrix.permissions.map((p) => ({
      key: p.key,
      roles: [...p.roles].sort(),
    })),
  });
}

/** A single toggle switch used in every matrix cell. */
function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-[42px] shrink-0 rounded-full transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 ${
        disabled ? "" : "cursor-pointer"
      } ${checked ? "bg-primary" : "bg-surface-elevated"}`}
    >
      <span
        className={`inline-block h-[18px] w-[18px] transform rounded-full transition-transform duration-150 ${
          checked
            ? "translate-x-[21px] bg-gray-900"
            : "translate-x-[3px] bg-text"
        } mt-[3px]`}
      />
    </button>
  );
}

export default function PermissionsPage() {
  const { user, refreshUser } = useAuth();

  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null);
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchMatrix = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await permissionsService.get();
      setMatrix(res.data);
      setInitial(snapshot(res.data));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load permissions",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount pattern used across this app
    if (user?.role === "admin") fetchMatrix();
  }, [user, fetchMatrix]);

  if (user?.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl bg-surface ring-1 ring-border-light">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-900/30 ring-1 ring-red-500/20">
            <svg
              className="h-5 w-5 text-danger"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v2m0 4h.01" />
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
          </div>
          <p className="text-sm text-danger font-medium">
            Admin access required.
          </p>
        </div>
      </div>
    );
  }

  const isDirty = matrix ? snapshot(matrix) !== initial : false;

  const toggle = (key: string, role: string) => {
    setMatrix(
      (prev) =>
        prev && {
          ...prev,
          permissions: prev.permissions.map((p) =>
            p.key === key
              ? {
                  ...p,
                  roles: p.roles.includes(role)
                    ? p.roles.filter((r) => r !== role)
                    : [...p.roles, role],
                }
              : p,
          ),
        },
    );
    setSuccess(null);
  };

  const reset = () => {
    if (!matrix) return;
    setMatrix(JSON.parse(initial));
    setError(null);
    setSuccess(null);
  };

  const save = async () => {
    if (!matrix) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = matrix.permissions.map((p) => ({
        key: p.key,
        roles: p.roles,
      }));
      const res = await permissionsService.update(payload);
      setMatrix(res.data);
      setInitial(snapshot(res.data));
      setSuccess("Permissions saved");
      await refreshUser();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save permissions",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(26px,2.6vw,32px)] font-bold tracking-[-0.03em] text-text">
            Permissions
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Choose what each role can do. Changes apply as soon as you save.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            disabled={!isDirty}
            aria-label="Reset permissions"
          >
            Reset
          </Button>
          <Button size="sm" onClick={save} loading={saving} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 rounded-xl bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20"
          role="alert"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="mb-4 rounded-xl bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20"
          role="alert"
        >
          {success}
        </div>
      )}

      <div className={`${PANEL} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
          </div>
        ) : !matrix ? (
          <p className="px-6 py-12 text-center text-sm text-text-secondary">
            Failed to load permissions.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-light bg-surface-secondary/45">
                  <th className={TH}>Permission</th>
                  {matrix.roles.map((role) => (
                    <th key={role} className={`${TH} w-[120px] text-center`}>
                      {ROLE_LABELS[role] ?? role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.permissions.map((perm) => (
                  <tr
                    key={perm.key}
                    className="border-b border-border-light/60 transition-colors last:border-b-0 hover:bg-surface-elevated/25"
                  >
                    <th
                      scope="row"
                      className="px-4 py-3.5 text-left font-medium"
                    >
                      <span className="block text-sm font-medium text-text">
                        {perm.label}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-text-secondary/60">
                        {perm.description}
                      </span>
                    </th>
                    {matrix.roles.map((role) => (
                      <td
                        key={role}
                        className="w-[120px] px-4 py-3.5 text-center"
                      >
                        <Toggle
                          checked={perm.roles.includes(role)}
                          onChange={() => toggle(perm.key, role)}
                          disabled={
                            role === "admin" && perm.defaults.includes("admin")
                          }
                          label={`${perm.label}: ${ROLE_LABELS[role] ?? role}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
