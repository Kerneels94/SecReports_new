/**
 * Profile page — view and edit account information and change password.
 * @route /profile
 */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { authService, userService } from "@/services";
import { hasPermission } from "@/lib/permissions";

const PANEL = "rounded-[18px] border border-border-light bg-surface p-[22px]";

/** Profile page component with account info, name edit, and password change form. */
export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();

  const [editName, setEditName] = useState(user?.name ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (!passwordSuccess) return;
    const timer = setTimeout(() => setPasswordSuccess(null), 5000);
    return () => clearTimeout(timer);
  }, [passwordSuccess]);

  if (!user) return null;

  // PATCH /auth/users/:id needs users.update, so only offer the name field to users who can save it.
  const canEditName = hasPermission(user, "users.update");

  const handleProfileSave = async () => {
    setProfileError(null);
    setProfileSuccess(null);
    if (!editName.trim()) {
      setProfileError("Name is required");
      return;
    }
    setProfileLoading(true);
    try {
      await userService.update(user.id, { name: editName });
      await refreshUser();
      setProfileSuccess("Profile updated");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);
    if (!currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }
    setPasswordLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // The server ended every session, this one included, so sign out now rather than fail later.
      await logout();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const avatarInitial = user.name.charAt(0).toUpperCase();

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-[clamp(26px,2.6vw,32px)] font-bold tracking-[-0.03em] text-text">
          My Profile
        </h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          View and manage your account information.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className={PANEL}>
          <div className="mb-[22px] flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-2xl font-bold text-primary">
              {avatarInitial}
            </div>
            <div>
              <b className="block text-xl font-semibold text-text">{user.name}</b>
              <span className="mt-1.5 inline-block rounded-full border border-primary/20 bg-primary/[0.08] px-2 py-0.5 text-[11px] font-semibold capitalize text-primary">
                {user.role}
              </span>
            </div>
          </div>

          <dl className="mb-6 grid grid-cols-1 gap-x-5 gap-y-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs text-text-secondary/60">Email</dt>
              <dd className="mt-0.5 text-sm text-text">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary/60">Role</dt>
              <dd className="mt-0.5 text-sm capitalize text-text">{user.role}</dd>
            </div>
            <div>
              <dt className="text-xs text-text-secondary/60">Status</dt>
              <dd className="mt-0.5 text-sm capitalize text-text">{user.status}</dd>
            </div>
          </dl>

          {user.role !== "admin" && (
            <div className="mb-4 rounded-xl bg-blue-900/20 px-4 py-3 text-sm text-blue-300 ring-1 ring-blue-500/20" role="status">
              Your profile details can only be updated by an admin. Contact them to request changes.
            </div>
          )}
          {profileError && (
            <div className="mb-4 rounded-xl bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="mb-4 rounded-xl bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="status">
              {profileSuccess}
            </div>
          )}

          {canEditName && (
            <div className="flex flex-col gap-4">
              <Input
                label="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={user.name}
              />
              <Button variant="secondary" className="w-full" onClick={handleProfileSave} loading={profileLoading}>
                Save
              </Button>
            </div>
          )}
        </div>

        <div className={PANEL}>
          <h2 className="mb-[18px] text-[17px] font-semibold text-text">Change Password</h2>
          {passwordError && (
            <div className="mb-3 rounded-xl bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="mb-3 rounded-xl bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="status">
              {passwordSuccess}
            </div>
          )}
          <div className="flex flex-col gap-4">
            <Input
              label="Current Password"
              labelClassName="text-base"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
            />
            <Input
              label="New Password"
              labelClassName="text-base"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
            <p className="text-base font-medium text-text/90">A strong password contains:</p>
            <ul className="ml-1 list-disc space-y-0.5 pl-4 text-sm text-text-secondary/60">
              <li>At least 8 characters</li>
              <li>At least one lowercase letter</li>
              <li>At least one uppercase letter</li>
              <li>At least one digit</li>
              <li>At least one special character</li>
            </ul>
            <Input
              label="Confirm New Password"
              labelClassName="text-base"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
            <Button type="button" loading={passwordLoading} className="w-full" onClick={handlePasswordChange}>
              Update Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
