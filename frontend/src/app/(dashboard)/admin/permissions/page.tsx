/**
 * Permissions page — role × permission matrix toggling for a company admin.
 * Each switch grants (on) or revokes (off) a permission for a role. Changes
 * are persisted via PUT /admin/permissions and enforced server-side.
 * @route /admin/permissions
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { permissionsService, type PermissionMatrix } from "@/services";
import { useAuth } from "@/hooks/useAuth";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Manager",
  senior: "Senior",
};

/** Snapshot used to detect unsaved changes. */
function snapshot(matrix: PermissionMatrix): string {
  return JSON.stringify({
    roles: matrix.roles,
    permissions: matrix.permissions.map((p) => ({ key: p.key, roles: [...p.roles].sort() })),
  });
}

/** A single toggle switch used in every matrix cell. */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
        checked ? "bg-primary" : "bg-surface-elevated ring-1 ring-inset ring-border-light"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function PermissionsPage() {
  const { user } = useAuth();

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
      setError(err instanceof Error ? err.message : "Failed to load permissions");
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
            <svg className="h-5 w-5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01" /><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
          </div>
          <p className="text-sm text-danger font-medium">Admin access required.</p>
        </div>
      </div>
    );
  }

  const isDirty = matrix ? snapshot(matrix) !== initial : false;

  const toggle = (key: string, role: string) => {
    setMatrix((prev) =>
      prev && {
        ...prev,
        permissions: prev.permissions.map((p) =>
          p.key === key
            ? { ...p, roles: p.roles.includes(role)
                ? p.roles.filter((r) => r !== role)
                : [...p.roles, role] }
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
      const payload = matrix.permissions.map((p) => ({ key: p.key, roles: p.roles }));
      const res = await permissionsService.update(payload);
      setMatrix(res.data);
      setInitial(snapshot(res.data));
      setSuccess("Permissions saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Permissions</h1>
          <p className="text-sm text-text-secondary mt-1">
            Control which roles can access each feature. Changes take effect immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={reset} disabled={!isDirty} aria-label="Reset permissions">
            Reset
          </Button>
          <Button onClick={save} loading={saving} disabled={!isDirty}>
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="alert">
          {success}
        </div>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : !matrix ? (
            <p className="px-6 py-12 text-sm text-text-secondary text-center">Failed to load permissions.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-light bg-surface-elevated/20">
                    <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider min-w-[220px]">Permission</th>
                    {matrix.roles.map((role) => (
                      <th key={role} className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">
                        {ROLE_LABELS[role] ?? role}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.permissions.map((perm, idx) => (
                    <tr key={perm.key} className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors ${idx % 2 === 0 ? "bg-surface-elevated/10" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-text">{perm.label}</span>
                          <span className="text-xs text-text-secondary/70">{perm.description}</span>
                        </div>
                      </td>
                      {matrix.roles.map((role) => (
                        <td key={role} className="px-4 py-3">
                          <Toggle
                            checked={perm.roles.includes(role)}
                            onChange={() => toggle(perm.key, role)}
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
        </CardContent>
      </Card>
    </div>
  );
}