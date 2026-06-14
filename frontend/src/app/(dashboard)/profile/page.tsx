/**
 * Profile page — view and edit account information and change password.
 * @route /profile
 */
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { authService, userService } from "@/services";

/** Profile page component with account info display/edit and password change form. */
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<string>("senior");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  if (!user) return null;

  const startEditing = () => {
    setEditName(user.name);
    setEditRole(user.role);
    setEditing(true);
    setProfileError(null);
    setProfileSuccess(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setProfileError(null);
  };

  const handleProfileSave = async () => {
    setProfileError(null);
    setProfileSuccess(null);
    if (!editName.trim()) {
      setProfileError("Name is required");
      return;
    }
    setProfileLoading(true);
    try {
      await userService.update(user.id, {
        name: editName,
        role: editRole,
      });
      await refreshUser();
      setProfileSuccess("Profile updated");
      setEditing(false);
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
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text">My Profile</h1>
        <p className="text-sm text-text-secondary mt-1">View and manage your account information.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Account Information</CardTitle>
            {user.role === "owner" && !editing && (
              <Button variant="secondary" size="sm" onClick={startEditing}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {user.role !== "owner" && (
            <div className="rounded-lg bg-blue-900/20 px-4 py-3 text-sm text-blue-300 ring-1 ring-blue-500/20" role="status">
              Your profile details can only be updated by an owner. Contact them to request changes.
            </div>
          )}

          {profileError && (
            <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="rounded-lg bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="status">
              {profileSuccess}
            </div>
          )}

          <div className="flex items-center gap-4 pb-2 border-b border-border-light/30">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-2xl font-bold text-primary ring-2 ring-primary/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-text">{user.name}</p>
              <p className="text-sm text-text-secondary capitalize">{user.role}</p>
            </div>
          </div>

          {editing ? (
            <div className="flex flex-col gap-4">
              <Input
                label="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text/90">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="rounded-lg border border-border bg-surface-elevated/40 px-3 py-2.5 text-sm text-text focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/20 transition-all duration-150"
                >
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="senior">Senior</option>
                </select>
              </div>
              <div className="flex gap-3">
                <Button onClick={handleProfileSave} loading={profileLoading}>
                  Save
                </Button>
                <Button variant="secondary" onClick={cancelEditing}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-border-light/30">
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="text-sm font-medium text-text-secondary/70">Email</span>
                <span className="text-sm text-text">{user.email}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="text-sm font-medium text-text-secondary/70">Role</span>
                <span className="text-sm text-text capitalize">{user.role}</span>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <span className="text-sm font-medium text-text-secondary/70">Status</span>
                <span className="text-sm text-text capitalize">{user.status}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}
            className="flex flex-col gap-4"
          >
            {passwordError && (
              <div className="rounded-lg bg-red-900/20 px-4 py-3 text-sm text-danger ring-1 ring-red-500/20" role="alert">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="rounded-lg bg-green-900/20 px-4 py-3 text-sm text-success ring-1 ring-green-500/20" role="status">
                {passwordSuccess}
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter your current password"
            />
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
            />
            <Button type="submit" loading={passwordLoading} className="self-start">
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
