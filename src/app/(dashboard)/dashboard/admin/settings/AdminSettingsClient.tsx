"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, Button, Input, Switch } from "@heroui/react";
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
  Store,
  Database,
  Save,
} from "lucide-react";
import { toast } from "react-toastify";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";

const SETTING_TABS = [
  { id: "store", label: "Store & System", icon: Store },
  { id: "notifications", label: "Notifications & Alerts", icon: Bell },
  { id: "security", label: "Security & Sessions", icon: Shield },
  { id: "database", label: "Maintenance & Logs", icon: Database },
];

export interface AdminActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface AdminSettingsData {
  store: {
    storeName: string;
    supportEmail: string;
    supportPhone: string;
    currency: string;
    timezone: string;
    orderPrefix: string;
    lowStockThreshold: number;
    maintenanceMode: boolean;
  };
  notifications: {
    emailOnNewOrder: boolean;
    emailOnLowStock: boolean;
    emailOnNewUser: boolean;
    smsOnCriticalError: boolean;
    dailyDigest: boolean;
  };
  security: {
    twoFactor: boolean;
    sessionTimeoutMins: number;
    activeSessions: AdminActiveSession[];
  };
}

interface AdminSettingsClientProps {
  initialSettings?: AdminSettingsData;
}

export default function AdminSettingsClient({
  initialSettings,
}: AdminSettingsClientProps) {
  const { guardDemo } = useDemoAdmin();
  const [activeTab, setActiveTab] = useState("store");

  // Store & System State
  const [storeName, setStoreName] = useState(
    initialSettings?.store.storeName || "Electro Store"
  );
  const [supportEmail, setSupportEmail] = useState(
    initialSettings?.store.supportEmail || "support@electro.com"
  );
  const [supportPhone, setSupportPhone] = useState(
    initialSettings?.store.supportPhone || "+1 (555) 019-2834"
  );
  const [currency, setCurrency] = useState(
    initialSettings?.store.currency || "USD"
  );
  const [timezone, setTimezone] = useState(
    initialSettings?.store.timezone || "America/New_York"
  );
  const [orderPrefix, setOrderPrefix] = useState(
    initialSettings?.store.orderPrefix || "ELC-"
  );
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialSettings?.store.lowStockThreshold || 5
  );
  const [maintenanceMode, setMaintenanceMode] = useState(
    initialSettings?.store.maintenanceMode || false
  );

  // Notifications State
  const [emailOnNewOrder, setEmailOnNewOrder] = useState(
    initialSettings?.notifications.emailOnNewOrder ?? true
  );
  const [emailOnLowStock, setEmailOnLowStock] = useState(
    initialSettings?.notifications.emailOnLowStock ?? true
  );
  const [emailOnNewUser, setEmailOnNewUser] = useState(
    initialSettings?.notifications.emailOnNewUser ?? false
  );
  const [smsOnCriticalError, setSmsOnCriticalError] = useState(
    initialSettings?.notifications.smsOnCriticalError ?? true
  );
  const [dailyDigest, setDailyDigest] = useState(
    initialSettings?.notifications.dailyDigest ?? true
  );

  // Security State
  const [twoFactor, setTwoFactor] = useState(
    initialSettings?.security.twoFactor ?? false
  );
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState(
    initialSettings?.security.sessionTimeoutMins ?? 60
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [activeSessions, setActiveSessions] = useState<AdminActiveSession[]>(
    initialSettings?.security.activeSessions || [
      {
        id: "sess-1",
        device: "Windows 11 (Chrome 128)",
        location: "New York, NY, USA",
        lastActive: "Active Now",
        isCurrent: true,
      },
      {
        id: "sess-2",
        device: "MacBook Pro (Safari 17.5)",
        location: "New York, NY, USA",
        lastActive: "4 hours ago",
        isCurrent: false,
      },
    ]
  );

  const handleStoreSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (guardDemo()) return;
    toast.success("Store & system settings saved successfully!");
  };

  const handleNotificationsSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (guardDemo()) return;
    toast.success("Admin notification alerts updated!");
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (guardDemo()) return;
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match!");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long.");
      return;
    }
    toast.success("Admin password changed successfully!");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleRevokeSession = (sessionId: string) => {
    if (guardDemo()) return;
    setActiveSessions((prev) => prev.filter((s) => s.id !== sessionId));
    toast.success("Session revoked successfully.");
  };

  const handleClearCache = () => {
    if (guardDemo()) return;
    toast.success("Application and redis cache cleared successfully!");
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
          <Link href="/dashboard/admin" className="hover:text-sky-600 transition-colors">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span className="text-sky-600 dark:text-sky-400">Settings</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Admin{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Settings
          </span>
        </h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Manage system configurations, alert preferences, security rules, and store parameters.
        </p>
      </div>

      {/* ── Settings Tabs Navigation ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-gray-800">
        {SETTING_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-sky-500 text-white shadow-xs shadow-sky-500/20"
                  : "text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab 1: Store & System ── */}
      {activeTab === "store" && (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Store &amp; System Configuration
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Configure global store details, order identifiers, and operating modes.
            </p>
          </div>

          <form onSubmit={handleStoreSave} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Store Public Name
                </label>
                <Input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Support Email
                </label>
                <Input
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Support Phone
                </label>
                <Input
                  type="tel"
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Primary Currency
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
                  System Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:border-sky-500 focus:outline-none"
                >
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="UTC">UTC (UTC+0)</option>
                  <option value="Asia/Dhaka">Asia/Dhaka (UTC+6)</option>
                  <option value="Europe/London">Europe/London (UTC+1)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Order ID Prefix
                </label>
                <Input
                  type="text"
                  value={orderPrefix}
                  onChange={(e) => setOrderPrefix(e.target.value)}
                  placeholder="ELC-"
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Low Stock Alert Threshold (Units)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={String(lowStockThreshold)}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                />
              </div>
            </div>

            {/* Maintenance Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <p className="font-bold text-gray-900 dark:text-white">
                    Maintenance Mode
                  </p>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Temporarily disable store checkout for regular customers during updates.
                </p>
              </div>
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer h-10 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Store Settings
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Tab 2: Notifications ── */}
      {activeTab === "notifications" && (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Administrator Alert Notifications
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select which system events trigger email or SMS alerts for your admin account.
            </p>
          </div>

          <form onSubmit={handleNotificationsSave} className="space-y-4 text-xs">
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 cursor-pointer">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    New Customer Order Placed
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Receive immediate email when a payment is processed.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailOnNewOrder}
                  onChange={(e) => setEmailOnNewOrder(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 cursor-pointer">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Low Stock Warnings
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Get alerted when products fall below the threshold.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailOnLowStock}
                  onChange={(e) => setEmailOnLowStock(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 cursor-pointer">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    New User Registration
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Notify whenever a new customer account is created.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailOnNewUser}
                  onChange={(e) => setEmailOnNewUser(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 cursor-pointer">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Critical System Errors (SMS)
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Send SMS alert on server downtime or payment gateway failure.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={smsOnCriticalError}
                  onChange={(e) => setSmsOnCriticalError(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40 cursor-pointer">
                <div>
                  <p className="font-bold text-gray-900 dark:text-white">
                    Daily Sales &amp; Inventory Summary
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Receive an end-of-day digest at 11:59 PM.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={dailyDigest}
                  onChange={(e) => setDailyDigest(e.target.checked)}
                  className="w-4 h-4 accent-sky-600 rounded cursor-pointer"
                />
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer h-10 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Notification Rules
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* ── Tab 3: Security & Sessions ── */}
      {activeTab === "security" && (
        <div className="space-y-6">
          {/* Password Change Card */}
          <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Change Admin Password
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ensure your administrator account uses a strong, complex password.
              </p>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-gray-700 dark:text-gray-300">
                  Current Password
                </label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-10 pr-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    New Password
                  </label>
                  <Input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-gray-700 dark:text-gray-300">
                    Confirm New Password
                  </label>
                  <Input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-950 focus:border-sky-500 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold transition-all shadow-xs cursor-pointer h-10 flex items-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Update Password
                </Button>
              </div>
            </form>
          </Card>

          {/* Active Sessions Card */}
          <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Active Admin Sessions
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Devices currently signed into this administrator account.
              </p>
            </div>

            <div className="space-y-3">
              {activeSessions.map((sess) => (
                <div
                  key={sess.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          {sess.device}
                        </span>
                        {sess.isCurrent && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Current Device
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">
                        {sess.location} • {sess.lastActive}
                      </p>
                    </div>
                  </div>

                  {!sess.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(sess.id)}
                      className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer"
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

      {/* ── Tab 4: Maintenance & Logs ── */}
      {activeTab === "database" && (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              System Maintenance &amp; Cache
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Administrative tools for cache invalidation and system health diagnostics.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40">
              <div className="space-y-0.5">
                <p className="font-bold text-gray-900 dark:text-white">
                  Purge Application Cache
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Clear server cache for categories, product filters, and home banner sliders.
                </p>
              </div>
              <Button
                onClick={handleClearCache}
                className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold hover:bg-slate-300 dark:hover:bg-gray-700 transition-colors h-9 cursor-pointer text-xs"
              >
                Clear Cache
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-950/40">
              <div className="space-y-0.5">
                <p className="font-bold text-gray-900 dark:text-white">
                  Export System Audit Logs
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Download a CSV of administrative actions and authentication events.
                </p>
              </div>
              <Button
                onClick={() => toast.info("Downloading audit logs CSV...")}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors h-9 cursor-pointer text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
