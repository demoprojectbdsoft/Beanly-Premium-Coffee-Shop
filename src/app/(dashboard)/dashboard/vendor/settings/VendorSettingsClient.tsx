"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import {
  Bell,
  CreditCard,
  KeyRound,
  LogOut,
  ShieldCheck,
  Store,
  UserRound,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";

/**
 * The seller's own account controls.
 *
 * Password, session and the pointers to the screens that hold everything else.
 * The storefront is not repeated here on purpose: one answer, one place to
 * change it, so the profile stays the only form a seller fills.
 */

interface VendorSettingsClientProps {
  vendorName: string;
  email: string;
  storeName: string;
  storeStatus: string;
}

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-xs text-[var(--foreground)] outline-none focus:border-[var(--brand-flat)] transition-colors";

const STATUS_LABELS: Record<string, string> = {
  active: "Live",
  suspended: "Suspended by the store team",
  closed: "Closed",
};

export default function VendorSettingsClient({
  vendorName,
  email,
  storeName,
  storeStatus,
}: VendorSettingsClientProps) {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("The new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        toast.error(error.message || "Could not update your password.");
        return;
      }

      toast.success("Password updated. Other sessions were signed out.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Could not update your password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/auth/login");
    } catch {
      toast.error("Could not sign out. Please try again.");
      setIsSigningOut(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Seller <span className="text-gradient-primary">Settings</span>
        </h1>
        <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
          Password, session and account controls for {vendorName}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Account ── */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <UserRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Account</h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                The sign-in and the shop it owns.
              </p>
            </div>
          </div>

          <dl className="space-y-2 text-[11px]">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[var(--foreground-muted)]">Name</dt>
              <dd className="font-bold text-[var(--foreground)] text-right">{vendorName}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[var(--foreground-muted)]">Email</dt>
              <dd className="font-bold text-[var(--foreground)] text-right break-all">
                {email || "No email"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[var(--foreground-muted)]">Store</dt>
              <dd className="font-bold text-[var(--foreground)] text-right">
                {storeName || "No store yet"}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-[var(--foreground-muted)]">Status</dt>
              <dd className="font-bold text-[var(--foreground)] text-right">
                {STATUS_LABELS[storeStatus] || storeStatus || "Unknown"}
              </dd>
            </div>
          </dl>

          <div className="pt-4 border-t border-[var(--border-color)]">
            <Link
              href="/dashboard/vendor/profile"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-[11px] font-bold border border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              Store profile
            </Link>
          </div>
        </Card>

        {/* ── Password ── */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Password</h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Changing it signs out every other device.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[var(--foreground)]">
                Current password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="••••••••"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--foreground)]">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  className={inputClass}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[var(--foreground)]">
                  Confirm password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repeat the new password"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="flex items-center gap-1.5 text-[10px] text-[var(--foreground-muted)]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secured by your account
              </p>
              <Button
                type="submit"
                isDisabled={isChangingPassword}
                className="bg-primary hover:bg-primary-hover text-white text-xs font-bold h-9 px-4 rounded-xl cursor-pointer"
              >
                {isChangingPassword ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        </Card>

        {/* ── Reach and billing ── */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)]">Plan and alerts</h3>
              <p className="text-xs text-[var(--foreground-muted)]">
                Where the money and the noise are handled.
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-[11px] text-[var(--foreground-muted)] leading-relaxed">
            <li className="flex items-start gap-2">
              <CreditCard className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Your plan, its renewal and the invoices live on{" "}
                <Link
                  href="/dashboard/vendor/subscription"
                  className="font-bold text-primary hover:underline"
                >
                  Plan &amp; Billing
                </Link>
                . Nothing here changes what the shop costs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Bell className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Orders, payouts and store-team decisions arrive in{" "}
                <Link
                  href="/dashboard/vendor/notifications"
                  className="font-bold text-primary hover:underline"
                >
                  Notifications
                </Link>
                , and go to <span className="font-bold text-[var(--foreground)]">{email}</span>.
              </span>
            </li>
          </ul>
        </Card>

        {/* ── Session ── */}
        <Card className="bg-[var(--surface)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <LogOut className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">Session</h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Sign out of this device when the shop closes for the day.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSignOut}
              isDisabled={isSigningOut}
              className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 text-xs font-bold h-9 px-4 rounded-xl cursor-pointer"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
