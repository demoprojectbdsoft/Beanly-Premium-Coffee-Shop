"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Switch,
  Modal,
} from "@heroui/react";
import {
  Settings,
  Bell,
  Lock,
  Globe,
  Shield,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Download,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Laptop,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";

const SETTING_TABS = [
  { id: "preferences", label: "Preferences & Localization", icon: Globe },
  { id: "notifications", label: "Notifications & Alerts", icon: Bell },
  { id: "security", label: "Security & Sessions", icon: Shield },
  { id: "privacy", label: "Privacy & Data", icon: Lock },
];

export interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface CustomerSettingsData {
  preferences: {
    currency: string;
    language: string;
  };
  notifications: {
    notifOrdersEmail: boolean;
    notifOrdersSms: boolean;
    notifPromosEmail: boolean;
    notifPromosSms: boolean;
    notifNewsletter: boolean;
  };
  security: {
    twoFactor: boolean;
    activeSessions: ActiveSession[];
  };
}

interface CustomerSettingsClientProps {
  initialSettings?: CustomerSettingsData;
}

export default function CustomerSettingsClient({
  initialSettings,
}: CustomerSettingsClientProps) {
  const [activeTab, setActiveTab] = useState("preferences");

  // Preferences State
  const [currency, setCurrency] = useState(
    initialSettings?.preferences.currency || "USD"
  );
  const [language, setLanguage] = useState(
    initialSettings?.preferences.language || "en"
  );

  // Notifications State
  const [notifOrdersEmail, setNotifOrdersEmail] = useState(
    initialSettings?.notifications.notifOrdersEmail ?? true
  );
  const [notifOrdersSms, setNotifOrdersSms] = useState(
    initialSettings?.notifications.notifOrdersSms ?? true
  );
  const [notifPromosEmail, setNotifPromosEmail] = useState(
    initialSettings?.notifications.notifPromosEmail ?? false
  );
  const [notifPromosSms, setNotifPromosSms] = useState(
    initialSettings?.notifications.notifPromosSms ?? false
  );
  const [notifNewsletter, setNotifNewsletter] = useState(
    initialSettings?.notifications.notifNewsletter ?? true
  );

  // Security State
  const [twoFactor, setTwoFactor] = useState(
    initialSettings?.security.twoFactor ?? false
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Delete Account State
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>(
    initialSettings?.security.activeSessions || [
      {
        id: "sess-1",
        device: "Windows PC (Chrome 124)",
        location: "Springfield, OR, USA",
        lastActive: "Active Now",
        isCurrent: true,
      },
      {
        id: "sess-2",
        device: "iPhone 15 Pro (Safari Mobile)",
        location: "Portland, OR, USA",
        lastActive: "2 hours ago",
        isCurrent: false,
      },
    ]
  );

  const handlePreferencesSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Preferences updated successfully!");
  };

  const handleNotificationsSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Notification settings saved!");
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    toast.success("Password updated securely!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleToggle2FA = () => {
    setTwoFactor(!twoFactor);
    if (!twoFactor) {
      toast.success("Two-Factor Authentication (2FA) enabled via Authenticator App.");
    } else {
      toast.info("Two-Factor Authentication disabled.");
    }
  };

  const handleRevokeSession = (id: string) => {
    setActiveSessions((prev) => prev.filter((s) => s.id !== id));
    toast.info("Session revoked successfully.");
  };

  const handleExportData = () => {
    toast.success("Preparing your account data archive (orders, profile, preferences)...");
    setTimeout(() => {
      toast.info("Account data downloaded: electro_user_data.json");
    }, 1200);
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmText("");
    setDeletePassword("");
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      toast.error("Please type DELETE to confirm.");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const payload: { password?: string } = {};
      if (deletePassword.trim()) {
        payload.password = deletePassword.trim();
      }

      const { error } = await authClient.deleteUser(payload);
      if (error) {
        toast.error(error.message || "Failed to delete account. Please try again.");
        return;
      }

      toast.success("Account deleted successfully.");
      setIsDeleteModalOpen(false);

      try {
        await authClient.signOut();
      } catch {
        // ignore
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account.";
      toast.error(msg);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
          <Link href="/dashboard/customer" className="hover:text-sky-600 transition-colors">
            Customer Dashboard
          </Link>
          <span>/</span>
          <span className="text-sky-600 dark:text-sky-400">Settings</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Account{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Settings
          </span>
        </h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage your system preferences, notifications, security, and account privacy.
        </p>
      </div>

      {/* ── Settings Layout: Side Tabs & Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab Buttons */}
        <div className="lg:col-span-1 space-y-1.5">
          {SETTING_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer text-left ${
                  isActive
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 border border-slate-200/80 dark:border-gray-800"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-3">
          {/* ── 1. Preferences & Localization ── */}
          {activeTab === "preferences" && (
            <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Preferences &amp; Localization
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Configure default currency, regional language, and shopping display options.
                </p>
              </div>

              <form onSubmit={handlePreferencesSave} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Display Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="BDT">BDT (৳) - Bangladeshi Taka</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:border-sky-500 focus:outline-none"
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="bn">বাংলা (Bengali)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer h-10"
                  >
                    Save Preferences
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ── 2. Notifications & Alerts ── */}
          {activeTab === "notifications" && (
            <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Notification Channels &amp; Alerts
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Choose what alerts you want to receive via Email and SMS.
                </p>
              </div>

              <form onSubmit={handleNotificationsSave} className="space-y-4 text-xs">
                {/* Order Updates */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      Order Confirmations &amp; Shipping Updates
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Receive tracking links and delivery status changes.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifOrdersEmail}
                        onChange={(e) => setNotifOrdersEmail(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
                      />
                      <span>Email</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifOrdersSms}
                        onChange={(e) => setNotifOrdersSms(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
                      />
                      <span>SMS</span>
                    </label>
                  </div>
                </div>

                {/* Promotional Deals */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      Discounts, Flash Sales &amp; Promo Codes
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Receive coupon alerts and seasonal sales.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPromosEmail}
                        onChange={(e) => setNotifPromosEmail(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
                      />
                      <span>Email</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPromosSms}
                        onChange={(e) => setNotifPromosSms(e.target.checked)}
                        className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
                      />
                      <span>SMS</span>
                    </label>
                  </div>
                </div>

                {/* Newsletter & Security */}
                <div className="p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">
                      Electro Weekly Tech Digest &amp; Security Alerts
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                      Curated hardware reviews and important account safety notifications.
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifNewsletter}
                      onChange={(e) => setNotifNewsletter(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-600 accent-sky-600 cursor-pointer"
                    />
                    <span>Enabled</span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer h-10"
                  >
                    Save Notifications
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ── 3. Security & Sessions ── */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Password Change Form */}
              <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Change Password
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Ensure your account is using a long, random password.
                  </p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4 text-xs max-w-md">
                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Current Password
                    </label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      New Password
                    </label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-gray-700 dark:text-gray-300">
                      Confirm New Password
                    </label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 font-semibold cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? "Hide Passwords" : "Show Passwords"}</span>
                    </button>

                    <Button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer h-10"
                    >
                      Update Password
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Two-Factor Authentication Card */}
              <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Two-Factor Authentication (2FA)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Add an extra layer of security with an Authenticator app.
                  </p>
                </div>
                <Button
                  onClick={handleToggle2FA}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer h-9 ${
                    twoFactor
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white"
                      : "bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-slate-200"
                  }`}
                >
                  {twoFactor ? "Enabled" : "Enable 2FA"}
                </Button>
              </Card>

              {/* Active Sessions */}
              <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Active Login Sessions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Devices currently signed into your Electro customer account.
                  </p>
                </div>

                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Laptop className="w-5 h-5 text-sky-500" />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {session.device}{" "}
                            {session.isCurrent && (
                              <span className="text-[10px] text-sky-600 dark:text-sky-400 font-extrabold ml-1">
                                (This Device)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {session.location} • {session.lastActive}
                          </p>
                        </div>
                      </div>

                      {!session.isCurrent && (
                        <button
                          onClick={() => handleRevokeSession(session.id)}
                          className="text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── 4. Privacy & Danger Zone ── */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              {/* Export Data */}
              <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Export Account Data
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Download an archive containing your full purchase history, saved addresses, and profile metadata.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer shrink-0 h-10"
                >
                  <Download className="w-4 h-4" />
                  <span>Export JSON</span>
                </Button>
              </Card>

              {/* Danger Zone */}
              <Card className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-bold">Danger Zone</h3>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300">
                  Once you delete your account, there is no going back. All orders, reward points, and saved addresses will be permanently wiped from our databases.
                </p>
                <div>
                  <Button
                    onClick={handleDeleteAccount}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer h-10"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Account Permanently</span>
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* ── Better-Auth Delete Account Confirmation Modal ── */}
      <Modal isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Modal.Backdrop className="bg-black/50 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
          <Modal.Container className="w-full max-w-md">
            <Modal.Dialog className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
              {/* Modal Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                    Delete Your Account?
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    This action is <strong className="text-rose-600 dark:text-rose-400">permanent and irreversible</strong>. All your personal data, order records, and rewards will be deleted according to Better-Auth protocols.
                  </p>
                </div>
              </div>

              {/* Confirmation Input Form */}
              <div className="space-y-3.5 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">DELETE</span> to confirm:
                  </label>
                  <Input
                    type="text"
                    placeholder="DELETE"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:border-rose-500 font-mono"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Account Password <span className="text-[10px] text-gray-400">(if applicable)</span>:
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your current password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-white focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-gray-800">
                <Button
                  variant="outline"
                  onPress={() => setIsDeleteModalOpen(false)}
                  isDisabled={isDeletingAccount}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800 cursor-pointer h-10"
                >
                  Cancel
                </Button>

                <Button
                  onPress={handleConfirmDeleteAccount}
                  isDisabled={deleteConfirmText.trim().toUpperCase() !== "DELETE" || isDeletingAccount}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 h-10 inline-flex items-center gap-2"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
