/**
 * Admin users page — allows admins to create, list, and edit employee users with role management.
 * @route /admin/users
 */
"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { authService, userService, type UserListItem } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  surname: z.string().max(255).optional(),
  email: z.string().email("Invalid email"),
  // Same rules as the backend's strongPassword, so a weak password is caught here with a clear message.
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(/[a-z]/, "Must include a lowercase letter")
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/\d/, "Must include a number")
    .regex(/[^a-zA-Z0-9]/, "Must include a special character"),
  role: z.enum(["manager", "senior"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

const PANEL = "rounded-[18px] border border-border-light bg-surface p-[22px]";
/** Employees shown per page. The list is fetched once and paged client-side. */
const USERS_PER_PAGE = 5;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function fullName(user: { name: string; surname?: string | null }): string {
  return [user.name, user.surname].filter(Boolean).join(" ");
}

function roleChip(role: string) {
  return role === "admin"
    ? "bg-primary/[0.08] text-primary border border-primary/20"
    : "bg-surface-elevated text-text-secondary border border-zinc-500";
}

/** Admin users page component with create form, employee list, and inline edit modal. */
export default function AdminUsersPage() {
  const { user } = useAuth();
  const canManageUsers = hasPermission(user, "users.manage");

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(users.length / USERS_PER_PAGE));
  // Clamp so deleting the last user on the final page doesn't leave an empty page.
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = users.slice((currentPage - 1) * USERS_PER_PAGE, currentPage * USERS_PER_PAGE);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<string>("senior");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteUser, setDeleteUser] = useState<UserListItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await authService.listUsers();
      setUsers(res.data);
    } catch {
      // silently fail
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManageUsers) fetchUsers();
  }, [canManageUsers, fetchUsers]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "senior" },
  });

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3 rounded-xl bg-surface px-6 py-8 ring-1 ring-border-light">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-900/30 ring-1 ring-red-500/20">
            <svg className="h-5 w-5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-danger">Admin access required.</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: CreateUserForm) => {
    try {
      setError(null);
      setSuccess(null);
      const res = await userService.create({
        ...data,
        surname: data.surname?.trim() || undefined,
      });
      setSuccess(res.data.message || `Verification email sent to ${data.email}`);
      reset();
      fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  const openEdit = (u: UserListItem) => {
    setEditUser(u);
    setEditName(u.name);
    setEditSurname(u.surname ?? "");
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditError(null);
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await userService.remove(deleteUser.id);
      setDeleteUser(null);
      setSuccess(`User ${fullName(deleteUser)} removed`);
      fetchUsers();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to remove user");
    } finally {
      setDeleteSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    if (!editName.trim()) { setEditError("Name is required"); return; }
    if (!editEmail.trim()) { setEditError("Email is required"); return; }

    setEditSaving(true);
    setEditError(null);
    try {
      const payload: { name: string; surname?: string; email: string; role?: string } = {
        name: editName,
        // Send "" (not undefined) so clearing the field actually removes the
        // surname; undefined was dropped from JSON and the old value stayed.
        surname: editSurname.trim(),
        email: editEmail,
      };
      if (editUser.role !== "admin") {
        payload.role = editRole;
      }
      await userService.update(editUser.id, payload);
      setEditUser(null);
      setSuccess(`User ${editEmail} updated`);
      fetchUsers();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[clamp(26px,2.6vw,32px)] font-bold tracking-[-0.03em] text-text">
          Users
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          Create and manage employee accounts for your company.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className={PANEL}>
          <h2 className="mb-[18px] text-[17px] font-semibold text-text">Add an employee</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {success && (
              <div className="rounded-xl bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="alert">
                {success}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
                {error}
              </div>
            )}
            <Input
              label="Name"
              placeholder="Employee name"
              error={errors.name?.message}
              {...register("name")}
            />
            <Input
              label="Surname"
              placeholder="Employee surname"
              error={errors.surname?.message}
              {...register("surname")}
            />
            <Input
              label="Email"
              type="email"
              placeholder="employee@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Temporary password"
              type="password"
              placeholder="Min. 8 characters"
              error={errors.password?.message}
              {...register("password")}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-sm font-medium text-text/90">Role</label>
              <select
                id="role"
                className="h-10 rounded-[9px] border border-border bg-surface-secondary px-3 text-sm text-text transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
                {...register("role")}
              >
                <option value="manager" className="bg-surface text-text">Manager</option>
                <option value="senior" className="bg-surface text-text">Senior</option>
              </select>
              {errors.role && (
                <p className="text-sm text-danger" role="alert">{errors.role.message}</p>
              )}
            </div>
            <Button type="submit" loading={isSubmitting} className="w-full">
              Create user
            </Button>
          </form>
        </div>

        <div className={PANEL}>
          <h2 className="mb-[18px] text-[17px] font-semibold text-text">
            Employees ({users.length})
          </h2>
          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/25 border-t-primary shadow-[0_0_24px_var(--color-primary-glow)]" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">No employees yet.</p>
          ) : (
            <ul className="m-0 list-none p-0">
              {pagedUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3.5 border-t border-border-light/60 py-3.5 first:border-t-0 first:pt-0"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-[13px] font-semibold text-primary">
                    {initials(fullName(u))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-sm font-medium text-text">
                      {fullName(u)}
                      {user?.id === u.id && (
                        <em className="ml-1 font-normal not-italic text-text-secondary/60">(you)</em>
                      )}
                    </b>
                    <small className="block truncate text-[13px] text-text-secondary/60">{u.email}</small>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${roleChip(u.role)}`}>
                    {u.role}
                  </span>
                  <span className="flex justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEdit(u)}
                      aria-label={`Edit ${fullName(u)}`}
                      className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text"
                    >
                      <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    {u.role !== "admin" && user?.id !== u.id && (
                      <button
                        type="button"
                        onClick={() => { setDeleteUser(u); setDeleteError(null); }}
                        aria-label={`Remove ${fullName(u)}`}
                        className="grid h-[34px] w-[34px] cursor-pointer place-items-center rounded-lg text-text-secondary transition-colors hover:bg-red-300/10 hover:text-red-300"
                      >
                        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                        </svg>
                      </button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {/* Always render the controls so admins see the page count; both
              buttons are disabled when everything fits on one page. */}
          {!usersLoading && (
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-light pt-3.5 text-[13px] text-text-secondary/60">
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  Previous
                </Button>
                <Button variant="ghost" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit ${editUser ? fullName(editUser) : "User"}`}
      >
        {editError && (
          <div className="mb-4 rounded-xl bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
            {editError}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Surname" value={editSurname} onChange={(e) => setEditSurname(e.target.value)} />
          <Input label="Email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
          {editUser?.role === "admin" ? (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text/90">Role</label>
              <Badge variant="info">admin</Badge>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text/90">Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="h-10 rounded-[9px] border border-border bg-surface-secondary px-3 text-sm text-text transition-colors focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="manager" className="bg-surface text-text">Manager</option>
                <option value="senior" className="bg-surface text-text">Senior</option>
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button onClick={handleEditSave} loading={editSaving}>Save</Button>
            <Button variant="secondary" onClick={() => setEditUser(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        title="Remove user"
      >
        {deleteError && (
          <div className="mb-4 rounded-xl bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
            {deleteError}
          </div>
        )}
        <p className="text-sm text-text-secondary">
          Remove {deleteUser ? fullName(deleteUser) : ""} ({deleteUser?.email})? Their account will be
          permanently deleted and all their sessions revoked. This cannot be undone.
        </p>
        <div className="flex gap-3 pt-4">
          <Button variant="danger" onClick={handleDelete} loading={deleteSaving}>
            Remove User
          </Button>
          <Button variant="secondary" onClick={() => setDeleteUser(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
