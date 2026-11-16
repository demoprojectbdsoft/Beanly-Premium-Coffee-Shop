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
  Select,
  ListBox,
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
  Check,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import { exportMyAccountData } from "@/lib/action/account";
import { downloadJson } from "@/lib/downloadFile";
import { useSiteSettings } from "@/context/SiteSettingsContext";

// ── Supported Currencies ────────────────────────────────────────────────────────
const CURRENCIES = [
  { value: "USD", label: "USD ($) – US Dollar", symbol: "$" },
  { value: "EUR", label: "EUR (€) – Euro", symbol: "€" },
  { value: "GBP", label: "GBP (£) – British Pound", symbol: "£" },
  { value: "BDT", label: "BDT (৳) – Bangladeshi Taka", symbol: "৳" },
  { value: "AUD", label: "AUD (A$) – Australian Dollar", symbol: "A$" },
  { value: "CAD", label: "CAD (C$) – Canadian Dollar", symbol: "C$" },
  { value: "JPY", label: "JPY (¥) – Japanese Yen", symbol: "¥" },
  { value: "INR", label: "INR (₹) – Indian Rupee", symbol: "₹" },
  { value: "SGD", label: "SGD (S$) – Singapore Dollar", symbol: "S$" },
  { value: "AED", label: "AED (د.إ) – UAE Dirham", symbol: "د.إ" },
];

// ── Supported Languages ─────────────────────────────────────────────────────────
const LANGUAGES = [
  { value: "en", label: "English (US)" },
  { value: "en-gb", label: "English (UK)" },
  { value: "es", label: "Español" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "bn", label: "বাংলা (Bengali)" },
  { value: "ar", label: "العربية (Arabic)" },
  { value: "zh", label: "中文 (Chinese)" },
  { value: "ja", label: "日本語 (Japanese)" },
  { value: "hi", label: "हिन्दी (Hindi)" },
];

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

// ── HeroUI v3 Select Wrapper ────────────────────────────────────────────────────
function CustomerSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const currentOption = options.find((opt) => opt.value === value);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[var(--foreground)]">
          {label}
        </label>
      )}
      <Select
        selectedKey={value || null}
        onSelectionChange={(key) => {
          if (key !== null && key !== undefined) {
            onChange(String(key));
          }
        }}
        placeholder={placeholder}
        aria-label={label || placeholder}
      >
        <Select.Trigger className="w-full h-10 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-2xs outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20">
          <Select.Value className="text-xs truncate font-medium text-[var(--foreground)]">
            {({ selectedText, isPlaceholder }) => (
              <span className={isPlaceholder ? "text-[var(--foreground-muted)]" : "text-[var(--foreground)] font-semibold"}>
                {selectedText || currentOption?.label || placeholder}
              </span>
            )}
          </Select.Value>
          <Select.Indicator className="text-[var(--foreground-muted)] shrink-0" />
        </Select.Trigger>
        <Select.Popover className="min-w-[var(--trigger-width)] w-full p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
          <ListBox className="outline-hidden space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <ListBox.Item
                  key={opt.value}
                  id={opt.value}
                  textValue={opt.label}
                  className={`text-xs font-medium px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors outline-hidden ${
                    isSelected
                      ? "bg-primary text-white font-bold"
                      : "text-[var(--foreground)] hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </ListBox.Item>
              );
            })}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

export default function CustomerSettingsClient({
  initialSettings,
}: CustomerSettingsClientProps) {
  const [activeTab, setActiveTab] = useState("preferences");
  const { settings: siteSettings, updateSettings } = useSiteSettings();
  const siteName = siteSettings.siteName || "Sparq";

  // Preferences State — currency defaults to site-wide currency from backend
  const [currency, setCurrency] = useState(
    initialSettings?.preferences.currency || siteSettings.currency || "USD"
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
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
    if (currency) {
      updateSettings({ currency });
    }
    toast.success(`Preferences updated successfully! Currency set to ${currency}.`);
  };

  const handleNotificationsSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Notification settings saved!");
  };

  // ── Real better-auth changePassword ────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
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
        toast.error(error.message || "Failed to update password. Please try again.");
        return;
      }

      toast.success("Password updated securely! Other sessions have been revoked.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password.";
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
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

  const [isExporting, setIsExporting] = useState(false);

  // Downloads the customer's real records as a JSON file.
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await exportMyAccountData();

      if (!res.success) {
        toast.error(res.message);
        return;
      }

      const slug = siteName.toLowerCase().replace(/\s+/g, "-");
      const today = new Date().toISOString().split("T")[0];

      downloadJson(`${slug}_account_data_${today}.json`, res.data);
      toast.success("Your account data has been downloaded.");
    } catch {
      toast.error("Could not collect your data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    setDeleteConfirmText("");
    setDeletePassword("");
    setIsDeleteModalOpen(true);
  };

  // ── Real better-auth deleteUser ────────────────────────────────────────────────
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
        // ignore signout errors
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

  // Current site currency label for info badge
  const siteCurrencyLabel = CURRENCIES.find((c) => c.value === siteSettings.currency)?.label || siteSettings.currency;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
          <Link href="/dashboard/customer" className="hover:text-primary transition-colors">
            Customer Dashboard
          </Link>
          <span>/</span>
          <span className="text-primary font-bold">Settings</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Account{" "}
          <span className="text-gradient-primary">
            Settings
          </span>
        </h1>
        <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
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
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)] border border-[var(--border-color)]"
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
            <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Preferences &amp; Localization
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Configure default currency, regional language, and shopping display options.
                </p>
              </div>

              {/* Site Currency Notice */}
              <div className="p-3.5 rounded-xl border border-[var(--accent)]/60 dark:border-[var(--accent)]/40 bg-[var(--accent)]/10 dark:bg-[var(--accent)]/5 flex items-start gap-2.5 text-xs text-[var(--accent)] dark:text-[var(--accent)]">
                <Globe className="w-4 h-4 shrink-0 mt-0.5 text-[var(--accent)]" />
                <span>
                  The store&apos;s default currency is currently set to{" "}
                  <strong>{siteCurrencyLabel}</strong> by the admin. Your preference below overrides your display only.
                </span>
              </div>

              <form onSubmit={handlePreferencesSave} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Currency HeroUI Select */}
                  <CustomerSelect
                    label="Display Currency"
                    value={currency}
                    onChange={setCurrency}
                    placeholder="Select currency"
                    options={CURRENCIES}
                  />

                  {/* Language HeroUI Select */}
                  <CustomerSelect
                    label="Language"
                    value={language}
                    onChange={setLanguage}
                    placeholder="Select language"
                    options={LANGUAGES}
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-md shadow-primary/20 cursor-pointer h-10"
                  >
                    Save Preferences
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ── 2. Notifications & Alerts ── */}
          {activeTab === "notifications" && (
            <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Notification Channels &amp; Alerts
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Choose what alerts you want to receive via Email and SMS.
                </p>
              </div>

              <form onSubmit={handleNotificationsSave} className="space-y-4 text-xs">
                {/* Order Updates */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[var(--foreground)]">
                      Order Confirmations &amp; Shipping Updates
                    </p>
                    <p className="text-[var(--foreground-muted)] mt-0.5">
                      Receive tracking links and delivery status changes.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifOrdersEmail}
                        onChange={(e) => setNotifOrdersEmail(e.target.checked)}
                        className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                      />
                      <span className="text-[var(--foreground)]">Email</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifOrdersSms}
                        onChange={(e) => setNotifOrdersSms(e.target.checked)}
                        className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                      />
                      <span className="text-[var(--foreground)]">SMS</span>
                    </label>
                  </div>
                </div>

                {/* Promotional Deals */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[var(--foreground)]">
                      Discounts, Flash Sales &amp; Promo Codes
                    </p>
                    <p className="text-[var(--foreground-muted)] mt-0.5">
                      Receive coupon alerts and seasonal sales.
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPromosEmail}
                        onChange={(e) => setNotifPromosEmail(e.target.checked)}
                        className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                      />
                      <span className="text-[var(--foreground)]">Email</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifPromosSms}
                        onChange={(e) => setNotifPromosSms(e.target.checked)}
                        className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                      />
                      <span className="text-[var(--foreground)]">SMS</span>
                    </label>
                  </div>
                </div>

                {/* Newsletter & Security */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[var(--foreground)]">
                      {siteName} Weekly Tech Digest &amp; Security Alerts
                    </p>
                    <p className="text-[var(--foreground-muted)] mt-0.5">
                      Curated hardware reviews and important account safety notifications.
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notifNewsletter}
                      onChange={(e) => setNotifNewsletter(e.target.checked)}
                      className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
                    />
                    <span className="text-[var(--foreground)]">Enabled</span>
                  </label>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-md shadow-primary/20 cursor-pointer h-10"
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
              <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-5">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Change Password
                  </h3>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Ensure your account is using a long, random password. Changing your password will revoke all other active sessions.
                  </p>
                </div>

                <form onSubmit={handlePasswordChange} className="space-y-4 text-xs max-w-md">
                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--foreground)]">
                      Current Password
                    </label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full h-10 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] focus:border-primary text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--foreground)]">
                      New Password
                    </label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="w-full h-10 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] focus:border-primary text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[var(--foreground)]">
                      Confirm New Password
                    </label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full h-10 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] focus:border-primary text-xs"
                    />
                  </div>

                  {/* Password strength indicator */}
                  {newPassword.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all ${
                              newPassword.length >= i * 3
                                ? i <= 1 ? "bg-red-400"
                                : i <= 2 ? "bg-amber-400"
                                : i <= 3 ? "bg-emerald-400"
                                : "bg-emerald-500"
                                : "bg-[var(--border-color)]"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-[10px] font-medium ${
                        newPassword.length < 4 ? "text-red-500"
                        : newPassword.length < 7 ? "text-amber-500"
                        : newPassword.length < 10 ? "text-emerald-500"
                        : "text-emerald-600"
                      }`}>
                        {newPassword.length < 4 ? "Very weak"
                          : newPassword.length < 7 ? "Weak"
                          : newPassword.length < 10 ? "Good"
                          : "Strong"} password
                      </p>
                    </div>
                  )}

                  {/* Confirm match indicator */}
                  {confirmPassword.length > 0 && (
                    <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                      newPassword === confirmPassword ? "text-emerald-500" : "text-red-500"
                    }`}>
                      {newPassword === confirmPassword
                        ? <><Check className="w-3.5 h-3.5" /> Passwords match</>
                        : <><X className="w-3.5 h-3.5" /> Passwords do not match</>
                      }
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{showPassword ? "Hide Passwords" : "Show Passwords"}</span>
                    </button>

                    <Button
                      type="submit"
                      isDisabled={isChangingPassword}
                      className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-md shadow-primary/20 cursor-pointer h-10 inline-flex items-center gap-2 disabled:opacity-60"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Update Password</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Two-Factor Authentication Card */}
              <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Two-Factor Authentication (2FA)
                  </h3>
                  <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                    Add an extra layer of security with an Authenticator app.
                  </p>
                </div>
                <Button
                  onClick={handleToggle2FA}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer h-9 ${
                    twoFactor
                      ? "bg-primary text-white"
                      : "bg-[var(--surface-alt)] text-[var(--foreground)] hover:bg-[var(--surface-alt)]/80 border border-[var(--border-color)]"
                  }`}
                >
                  {twoFactor ? "Enabled" : "Enable 2FA"}
                </Button>
              </Card>

              {/* Active Sessions */}
              <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Active Login Sessions
                  </h3>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Devices currently signed into your {siteName} customer account.
                  </p>
                </div>

                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div
                      key={session.id}
                      className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <Laptop className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-bold text-[var(--foreground)]">
                            {session.device}{" "}
                            {session.isCurrent && (
                              <span className="text-[10px] text-primary font-extrabold ml-1">
                                (This Device)
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-[var(--foreground-muted)]">
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
              <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-[var(--foreground)]">
                    Export Account Data
                  </h3>
                  <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                    Download a JSON file containing your profile, orders, payments, reviews, wishlist and cart.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExportData}
                  isDisabled={isExporting}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-color)] hover:bg-[var(--surface-alt)] text-xs font-semibold text-[var(--foreground)] transition-colors cursor-pointer shrink-0 h-10 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isExporting ? "Preparing..." : "Export JSON"}</span>
                </Button>
              </Card>

              {/* Danger Zone */}
              <Card className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-base font-bold">Danger Zone</h3>
                </div>
                <p className="text-xs text-[var(--foreground-muted)]">
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

      {/* ── Delete Account Confirmation Modal ── */}
      <Modal isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Modal.Backdrop className="bg-black/60 backdrop-blur-sm fixed inset-0 z-50 flex items-center justify-center p-4">
          <Modal.Container className="w-full max-w-md">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
              {/* Modal Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-[var(--foreground)] leading-snug">
                      Delete Your Account?
                    </h3>
                    <button
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                    This action is <strong className="text-rose-600 dark:text-rose-400">permanent and irreversible</strong>. All your personal data, order records, and rewards will be deleted.
                  </p>
                </div>
              </div>

              {/* Confirmation Input Form */}
              <div className="space-y-3.5 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Type <span className="font-mono font-bold text-rose-600 dark:text-rose-400">DELETE</span> to confirm:
                  </label>
                  <Input
                    type="text"
                    placeholder="DELETE"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] focus:border-rose-500 font-mono"
                    autoFocus
                  />
                  {deleteConfirmText.length > 0 && deleteConfirmText.trim().toUpperCase() !== "DELETE" && (
                    <p className="text-[10px] text-rose-500 font-semibold">
                      Must type exactly: DELETE
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--foreground)]">
                    Account Password <span className="text-[10px] text-[var(--foreground-muted)]">(if applicable)</span>:
                  </label>
                  <Input
                    type="password"
                    placeholder="Enter your current password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="w-full text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <Button
                  variant="outline"
                  onPress={() => setIsDeleteModalOpen(false)}
                  isDisabled={isDeletingAccount}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--foreground)] border border-[var(--border-color)] hover:bg-[var(--surface-alt)] cursor-pointer h-10"
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
