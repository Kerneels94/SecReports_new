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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { authService, userService, type UserListItem } from "@/services";
import { useAuth } from "@/hooks/useAuth";
import { hasPermission } from "@/lib/permissions";

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
  role: z.enum(["manager", "senior"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

/** Admin users page component with create form, employee list table, and inline edit modal. */
export default function AdminUsersPage() {
  const { user } = useAuth();
  const canManageUsers = hasPermission(user, "users.manage");

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [editName, setEditName] = useState("");
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
        <div className="flex flex-col items-center gap-3 px-6 py-8 rounded-xl bg-surface ring-1 ring-border-light">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-900/30 ring-1 ring-red-500/20">
            <svg className="h-5 w-5 text-danger" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v2m0 4h.01m21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
          </div>
          <p className="text-sm text-danger font-medium">Admin access required.</p>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: CreateUserForm) => {
    try {
      setError(null);
      setSuccess(null);
      const res = await userService.create(data);
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
      setSuccess(`User ${deleteUser.name} removed`);
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
      const payload: { name: string; email: string; role?: string } = {
        name: editName,
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
    <div className="flex flex-col gap-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">Manage Users</h1>
        <p className="text-sm text-text-secondary mt-1">Create and manage employee accounts for your company.</p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {success && (
                <div className="rounded-lg bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="alert">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
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
                label="Email"
                type="email"
                placeholder="employee@example.com"
                error={errors.email?.message}
                {...register("email")}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Min. 8 characters"
                error={errors.password?.message}
                {...register("password")}
              />
              <div className="flex flex-col gap-1.5">
                <label htmlFor="role" className="text-sm font-medium text-text/90">Role</label>
                <select
                  id="role"
                  className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
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
                Create User
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Employees ({users.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <p className="px-6 py-8 text-sm text-text-secondary text-center">No employees yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-light bg-surface-elevated/20">
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-right font-semibold text-text-secondary/80 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, idx) => (
                      <tr key={u.id} className={`border-b border-border-light/50 hover:bg-surface-elevated/20 transition-colors ${idx % 2 === 0 ? 'bg-surface-elevated/10' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-text">{u.name}</span>
                            <span className="text-xs text-text-secondary/60">{u.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={u.role === "admin" ? "info" : "default"}>{u.role}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                              Edit
                            </Button>
                            {u.role !== "admin" && user?.id !== u.id && (
                              <Button variant="danger" size="sm" onClick={() => { setDeleteUser(u); setDeleteError(null); }}>
                                Remove
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title={`Edit ${editUser?.name || "User"}`}
      >
        {editError && (
          <div className="mb-4 rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
            {editError}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
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
                className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
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
        title={`Remove user`}
      >
        {deleteError && (
          <div className="mb-4 rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
            {deleteError}
          </div>
        )}
        <p className="text-sm text-text-secondary">
          Remove {deleteUser?.name} ({deleteUser?.email})? Their account will be
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
