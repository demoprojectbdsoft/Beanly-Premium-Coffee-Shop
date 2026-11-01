"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, Button, Select, ListBox } from "@heroui/react";
import {
  ArrowLeft,
  ShieldCheck,
  User as UserIcon,
  Bike,
  Store,
  Ban,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  Award,
  Package,
  ExternalLink,
  Copy,
  Check,
  MapPin,
  FileText,
  Star,
  ShoppingBag,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  updateUser,
  setUserRoles,
  setUserRoleSuspension,
  revokeUserRole,
} from "@/lib/action/user";
import { rolesOf, roleOf, suspendedRolesOf } from "@/lib/core/roles";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import UserAvatar from "@/components/shared/UserAvatar";
import type { VendorApplicationDetail } from "@/types/vendor";
import type { RiderApplicationDetail } from "@/types/rider";

type RoleSuspensionRow = { role?: string; reason?: string; suspendedAt?: string };

/** The account row as the store API returns it; every role field is optional. */
type AdminUser = {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  image?: string;
  status?: string;
  member?: string;
  points?: number;
  createdAt?: string;
  role?: string;
  activeRole?: string;
  roles?: string[] | string;
  roleSuspensions?: RoleSuspensionRow[];
  vendorStatus?: string;
  vendorApplicationId?: string;
  vendorStoreId?: string;
  riderStatus?: string;
  riderApplicationId?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  availability?: string;
};

type OrderRow = {
  _id?: string;
  id?: string;
  orderNumber?: string;
  orderStatus?: string;
  status?: string;
  totalAmount?: number;
  totalPrice?: number;
  amount?: number;
  createdAt?: string;
  items?: unknown[];
};

interface UserDetailClientProps {
  user: AdminUser;
  orders: OrderRow[];
  vendorDetail: VendorApplicationDetail | null;
  riderDetail: RiderApplicationDetail | null;
}

const ROLE_META: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; chip: string }
> = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    chip: "bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/60",
  },
  demoadmin: {
    label: "Demo Admin",
    icon: ShieldCheck,
    chip: "bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/60",
  },
  vendor: {
    label: "Vendor",
    icon: Store,
    chip: "bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60",
  },
  rider: {
    label: "Rider",
    icon: Bike,
    chip: "bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
  },
  customer: {
    label: "Customer",
    icon: UserIcon,
    chip: "bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60",
  },
};

const ROLE_TOGGLES = ["admin", "vendor", "rider", "customer"];
const MARKETPLACE_ROLES = ["vendor", "rider"];

const STATUS_TONE: Record<string, string> = {
  approved:
    "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
  active:
    "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60",
  pending: "bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
  under_review:
    "bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
  rejected: "bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60",
  cancelled: "bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60",
  suspended: "bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60",
  none: "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)]",
};

function statusTone(value?: string): string {
  return STATUS_TONE[(value || "none").toLowerCase()] || STATUS_TONE.none;
}

const fmtDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

/** Small label/value line used across the read-only role panels. */
function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  const empty = value === undefined || value === null || value === "";
  return (
    <div className="space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
        {label}
      </p>
      <p className="text-xs font-semibold text-[var(--foreground)]">
        {empty ? <span className="text-[var(--foreground-muted)]">Not provided</span> : value}
      </p>
    </div>
  );
}

/** Product thumbnail that falls back to a bag icon when the image is missing. */
function ProductImage({ src, alt, size = 44 }: { src?: string | null; alt?: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const clean = typeof src === "string" ? src.trim() : "";
  const valid =
    clean.length > 0 &&
    clean !== "undefined" &&
    clean !== "null" &&
    !clean.includes("[object Object]") &&
    !errored;

  if (!valid) {
    return (
      <div
        className="flex items-center justify-center rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground-muted)] shrink-0"
        style={{ width: size, height: size }}
      >
        <ShoppingBag className="w-5 h-5" />
      </div>
    );
  }
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-color)]"
      style={{ width: size, height: size }}
    >
      <img src={clean} alt={alt || "Product"} className="w-full h-full object-contain p-1" onError={() => setErrored(true)} />
    </div>
  );
}

export default function UserDetailClient({
  user: initialUser,
  orders,
  vendorDetail,
  riderDetail,
}: UserDetailClientProps) {
  const router = useRouter();
  const { guardDemo } = useDemoAdmin();
  const { formatPrice } = useSiteSettings();

  const [user, setUser] = useState<AdminUser>(initialUser);
  const [copied, setCopied] = useState(false);
  const [busy, setBusyState] = useState(false);

  const userId = user._id || user.id || "";
  const held = rolesOf(user);
  const suspended = suspendedRolesOf(user);
  const active = roleOf(user);

  // The customer panel reads more than an order count: the purchase history the
  // old modal showed lived here too. Orders arrive whole, so the line items are
  // flattened for a product-level view and totalled for a spend summary.
  const purchasedProducts = (orders as unknown as any[]).flatMap((order) =>
    (order.items || []).map((item: any) => ({
      ...item,
      orderId: order._id || order.id,
      orderStatus: order.orderStatus || order.status || "processing",
      orderDate: order.createdAt,
    }))
  );
  const lifetimeSpend = (orders as unknown as any[]).reduce(
    (sum, o) => sum + Number(o.totalAmount ?? o.totalPrice ?? o.amount ?? 0),
    0
  );
  const lifetimeUnits = purchasedProducts.reduce(
    (sum: number, p: any) => sum + Number(p.quantity ?? 1),
    0
  );

  const setBusy = (fn: () => Promise<void>) => {
    if (guardDemo()) return;
    setBusyState(true);
    void fn().finally(() => setBusyState(false));
  };

  const patch = (next: Partial<AdminUser>) =>
    setUser((prev) => ({ ...prev, ...next }));

  // Overwrite the whole approved list. The API re-applies its invariants, so we
  // read roles/activeRole/roleSuspensions straight back off the response.
  const toggleRole = (role: string, checked: boolean) =>
    setBusy(async () => {
      const next = checked
        ? Array.from(new Set([...held, role]))
        : held.filter((r) => r !== role);
      if (next.length === 0) {
        toast.error("An account must keep at least one role");
        return;
      }
      const res = await setUserRoles(userId, next);
      if (res?.success !== false) {
        const data = (res?.data || {}) as Record<string, unknown>;
        patch({
          roles: (data.roles as string[]) ?? next,
          activeRole: (data.activeRole as string) ?? user.activeRole,
          role: (data.activeRole as string) ?? user.role,
          roleSuspensions: (data.roleSuspensions as RoleSuspensionRow[]) ?? user.roleSuspensions,
        });
        toast.success(checked ? `${role} granted` : `${role} revoked`);
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update roles");
      }
    });

  const toggleSuspension = (role: string, nextSuspended: boolean) =>
    setBusy(async () => {
      const res = await setUserRoleSuspension(userId, { role, suspended: nextSuspended });
      if (res?.success !== false) {
        const data = (res?.data || {}) as Record<string, unknown>;
        patch({
          roleSuspensions: (data.roleSuspensions as RoleSuspensionRow[]) ?? user.roleSuspensions,
          activeRole: (data.activeRole as string) ?? user.activeRole,
          role: (data.activeRole as string) ?? user.role,
        });
        toast.success(nextSuspended ? `${role} suspended` : `${role} released`);
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update suspension");
      }
    });

  // Revoke is stronger than suspend: it removes the authority and clears the
  // marketplace state behind it. Offered on each held marketplace role.
  const revoke = (role: string) =>
    setBusy(async () => {
      const res = await revokeUserRole(userId, { role });
      if (res?.success !== false) {
        toast.success(`${role} revoked`);
        // Revoke changes fields the panels read (status, application ids), so
        // drop the role locally for an instant reply and let the router pull
        // the authoritative row back on refresh.
        setUser((prev) => ({
          ...prev,
          roles: rolesOf(prev).filter((r) => r !== role),
          roleSuspensions: (prev.roleSuspensions || []).filter(
            (row) => String(row.role || "").toLowerCase() !== role
          ),
        }));
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to revoke role");
      }
    });

  const changeStatus = (status: string) =>
    setBusy(async () => {
      const res = await updateUser(userId, { status });
      if (res?.success !== false) {
        patch({ status });
        toast.success(`Account ${status}`);
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    });

  const copyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    toast.success("User ID copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const marketplaceStatusFor = (role: string): string =>
    role === "vendor"
      ? user.vendorStatus || vendorDetail?.application?.status || "none"
      : user.riderStatus || riderDetail?.application?.status || "none";

  return (
    <div className="space-y-6">
      {/* ── Back link ── */}
      <Link
        href="/dashboard/admin/users"
        className="inline-flex items-center gap-2 text-xs font-bold text-[var(--foreground-muted)] hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to users
      </Link>

      {/* ── Account header ── */}
      <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <UserAvatar
            src={user.image}
            name={user.name}
            size={64}
            className="rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-xs"
          />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold text-[var(--foreground)] truncate">
                {user.name || "Unnamed account"}
              </h1>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusTone(
                  user.status
                )}`}
              >
                {(user.status || "active").toLowerCase() === "active" ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Ban className="w-3 h-3" />
                )}
                <span className="capitalize">{user.status || "Active"}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--foreground-muted)]">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email || "—"}
              </span>
              {user.phone && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {user.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Joined {fmtDate(user.createdAt)}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {held.length === 0 ? (
                <span className="text-xs text-[var(--foreground-muted)]">No roles</span>
              ) : (
                held.map((role) => {
                  const meta = ROLE_META[role] || ROLE_META.customer;
                  const Icon = meta.icon;
                  const isSuspended = role !== "customer" && suspended.includes(role);
                  return (
                    <span
                      key={role}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        meta.chip
                      } ${role === active ? "ring-2 ring-[var(--accent)]/40" : ""} ${
                        isSuspended ? "opacity-60" : ""
                      }`}
                    >
                      {isSuspended ? <Ban className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                      <span className={`capitalize ${isSuspended ? "line-through" : ""}`}>
                        {meta.label}
                      </span>
                    </span>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-[var(--foreground-muted)] bg-[var(--surface-alt)] px-2 py-1 rounded-md border border-[var(--border-color)] max-w-[160px] truncate">
              {userId}
            </span>
            <button
              type="button"
              onClick={copyId}
              className="p-1.5 rounded-md text-[var(--foreground-muted)] hover:text-primary hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
              title="Copy User ID"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </Card>

      {/* ── Role & status controls ── */}
      <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--foreground)]">
            Roles &amp; access
          </h2>
          {busy && (
            <span className="text-[11px] font-semibold text-primary animate-pulse">Saving…</span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Grant / revoke */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-[var(--foreground-muted)]">Approved roles</p>
            <div className="flex flex-wrap gap-2">
              {ROLE_TOGGLES.map((role) => {
                const meta = ROLE_META[role];
                const Icon = meta.icon;
                const isHeld = held.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    disabled={busy}
                    onClick={() => toggleRole(role, !isHeld)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                      isHeld
                        ? "bg-primary text-white border-primary shadow-xs"
                        : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] border-[var(--border-color)] hover:border-primary hover:text-primary"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{meta.label}</span>
                    {isHeld && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              Admin is a single authority on its own; every other account always keeps the
              customer role so the person can still shop.
            </p>
          </div>

          {/* Whole-account status */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-[var(--foreground-muted)]">Account status</p>
            <Select
              aria-label="Account status"
              selectedKey={(user.status || "active").toLowerCase() === "suspended" ? "suspended" : "active"}
              onSelectionChange={(key) => key && changeStatus(String(key))}
              isDisabled={busy}
            >
              <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-bold text-[var(--foreground)] flex items-center justify-between gap-2 cursor-pointer shadow-xs [&>span]:text-xs [&>span]:font-bold [&>span]:truncate [&>span]:text-left">
                <Select.Value className="text-xs font-bold capitalize truncate flex-1 text-left" />
                <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
              </Select.Trigger>
              <Select.Popover className="w-(--trigger-width) min-w-[180px] p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                <ListBox>
                  <ListBox.Item key="active" id="active" textValue="Active" className="text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer">
                    <span className="inline-flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Active
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  <ListBox.Item key="suspended" id="suspended" textValue="Suspended" className="text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer">
                    <span className="inline-flex items-center gap-2">
                      <Ban className="w-3.5 h-3.5 text-rose-500" /> Suspended
                    </span>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                </ListBox>
              </Select.Popover>
            </Select>
            <p className="text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              This freezes the entire account and every dashboard at once. To close just one
              workspace, suspend that role below.
            </p>
          </div>
        </div>

        {/* Per-role suspension + revoke for held marketplace roles */}
        {MARKETPLACE_ROLES.filter((role) => held.includes(role)).length > 0 && (
          <div className="space-y-2 pt-1 border-t border-[var(--border-color)]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
              Per-role access
            </p>
            {MARKETPLACE_ROLES.filter((role) => held.includes(role)).map((role) => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;
              const isSuspended = suspended.includes(role);
              const reason = (user.roleSuspensions || []).find(
                (row) => String(row.role || "").toLowerCase() === role
              )?.reason;
              return (
                <div
                  key={role}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3.5 py-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)]"
                >
                  <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--foreground)]">
                    <Icon className="w-4 h-4 text-[var(--foreground-muted)]" />
                    <span className="capitalize">{meta.label}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusTone(marketplaceStatusFor(role))}`}>
                      <span className="capitalize">{marketplaceStatusFor(role) || "none"}</span>
                    </span>
                  </span>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    <Button
                      size="sm"
                      variant={isSuspended ? "primary" : "secondary"}
                      isDisabled={busy}
                      onPress={() => toggleSuspension(role, !isSuspended)}
                      className="h-8 rounded-lg text-xs font-semibold cursor-pointer"
                    >
                      {isSuspended ? "Release dashboard" : "Suspend dashboard"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      isDisabled={busy}
                      onPress={() => revoke(role)}
                      className="h-8 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    >
                      Revoke
                    </Button>
                  </div>
                  {isSuspended && reason && (
                    <p className="text-[10px] text-[var(--foreground-muted)] w-full sm:w-auto sm:basis-full">
                      Reason: {reason}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Role panels stack in one column (customer, rider, vendor) so a wide
          table row never squeezes them side by side and breaks the layout. */}
      <div className="grid grid-cols-1 gap-6">
        {/* ── Customer panel ── */}
        {held.includes("customer") && (
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2">
              <UserIcon className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--foreground)]">
                Customer
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-1">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Tier
                </p>
                <p className="text-sm font-bold text-[var(--foreground)] capitalize">{user.member || "Standard"}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-1">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <Award className="w-3 h-3 text-amber-500" /> Points
                </p>
                <p className="text-sm font-bold text-[var(--foreground)]">{user.points ?? 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-1">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <Package className="w-3 h-3 text-primary" /> Orders
                </p>
                <p className="text-sm font-bold text-[var(--foreground)]">{orders.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-1">
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <ShoppingBag className="w-3 h-3 text-emerald-500" /> Lifetime
                </p>
                <p className="text-sm font-bold text-[var(--foreground)]">{formatPrice(lifetimeSpend)}</p>
                <p className="text-[10px] text-[var(--foreground-muted)]">{lifetimeUnits} item{lifetimeUnits === 1 ? "" : "s"} bought</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground-muted)]">
                <Package className="w-3.5 h-3.5" /> Recent orders ({orders.length})
              </p>
              {orders.length === 0 ? (
                <p className="text-xs text-[var(--foreground-muted)] p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)]">
                  No orders placed yet.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {orders.slice(0, 25).map((order, idx) => {
                    const id = order._id || order.id || String(idx);
                    const status = (order.orderStatus || order.status || "processing").toLowerCase();
                    const amount = order.totalAmount ?? order.totalPrice ?? order.amount ?? 0;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)]"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--foreground)] truncate">
                            {order.orderNumber || id}
                          </p>
                          <p className="text-[10px] text-[var(--foreground-muted)]">{fmtDate(order.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusTone(status)}`}>
                            {status}
                          </span>
                          <span className="text-xs font-extrabold text-[var(--foreground)]">{formatPrice(amount)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Purchased products — the line-item view the old users modal showed */}
            {purchasedProducts.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-[var(--border-color)]">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--foreground-muted)]">
                  <ShoppingBag className="w-3.5 h-3.5" /> Purchased products ({purchasedProducts.length})
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {purchasedProducts.map((prod: any, idx: number) => {
                    const pId =
                      typeof prod.productId === "object"
                        ? prod.productId?._id || prod.productId?.id
                        : prod.productId || prod.id;
                    const pTitle = prod.title || prod.productId?.title || prod.name || "Product";
                    const pSlug = prod.slug || prod.productId?.slug || pId;
                    const pImage =
                      prod.image ||
                      prod.productId?.image ||
                      (Array.isArray(prod.productId?.additionalImages) && prod.productId.additionalImages[0]) ||
                      (Array.isArray(prod.additionalImages) && prod.additionalImages[0]) ||
                      (Array.isArray(prod.productId?.images) && prod.productId.images[0]) ||
                      (Array.isArray(prod.images) && prod.images[0]) ||
                      "";
                    const pPrice = prod.price ?? prod.productId?.price ?? 0;
                    const pQty = prod.quantity ?? 1;
                    const pStatus = String(prod.orderStatus || "processing").toLowerCase();
                    return (
                      <div
                        key={`${prod.orderId}-${idx}`}
                        className="p-2.5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ProductImage src={pImage} alt={pTitle} size={44} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[var(--foreground)] truncate">{pTitle}</p>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[var(--foreground-muted)]">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{formatPrice(pPrice)}</span>
                              <span>•</span>
                              <span>Qty: {pQty}</span>
                              <span>•</span>
                              <span className="text-[10px] text-[var(--foreground-muted)]">{fmtDate(prod.orderDate)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusTone(pStatus)}`}>
                            {pStatus}
                          </span>
                          {pSlug && (
                            <Link
                              href={`/shop/${pSlug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--foreground-muted)] hover:text-primary transition-colors"
                              title="View product in store"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ── Rider panel ── */}
        {(held.includes("rider") || (user.riderStatus && user.riderStatus !== "none") || riderDetail) && (
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--foreground)]">Rider</h2>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusTone(marketplaceStatusFor("rider"))}`}>
                {marketplaceStatusFor("rider") || "none"}
              </span>
            </div>

            {held.includes("rider") && suspended.includes("rider") && (
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <Ban className="w-3.5 h-3.5" /> Rider dashboard is suspended.
              </p>
            )}

            {/* Live online/offline state — the same switch the rider toggles
                on their profile, and what the assignment list filters on. */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                (user.availability || "online") === "offline"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
              }`}
            >
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  (user.availability || "online") === "offline" ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
              {(user.availability || "online") === "offline" ? "Offline — not getting new jobs" : "Online — available for jobs"}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vehicle" value={user.vehicleType ? <span className="capitalize">{user.vehicleType}</span> : undefined} />
              <Field label="Vehicle number" value={user.vehicleNumber} />
              <Field label="License number" value={user.licenseNumber} />
            </div>

            {riderDetail?.application && (
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--border-color)]">
                <Field label="Application" value={riderDetail.application.reference} />
                <Field label="Submitted" value={fmtDate(riderDetail.application.submittedAt)} />
                <Field
                  label="Service area"
                  value={
                    riderDetail.application.serviceAddress?.city ||
                    riderDetail.application.serviceAddress?.division ||
                    undefined
                  }
                />
                <Field
                  label="Max distance"
                  value={
                    riderDetail.application.availability?.maxDistanceKm
                      ? `${riderDetail.application.availability.maxDistanceKm} km`
                      : undefined
                  }
                />
                {riderDetail.application.documents?.drivingLicenseUrl && (
                  <a
                    href={riderDetail.application.documents.drivingLicenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="col-span-2 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5" /> Driving license document
                  </a>
                )}
              </div>
            )}

            {riderDetail?.application?._id && (
              <Link
                href={`/dashboard/admin/riders/${riderDetail.application._id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Open rider application review
              </Link>
            )}
          </Card>
        )}

        {/* ── Vendor panel ── */}
        {(held.includes("vendor") || (user.vendorStatus && user.vendorStatus !== "none") || vendorDetail) && (
          <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-teal-500" />
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[var(--foreground)]">Vendor</h2>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${statusTone(marketplaceStatusFor("vendor"))}`}>
                {marketplaceStatusFor("vendor") || "none"}
              </span>
            </div>

            {held.includes("vendor") && suspended.includes("vendor") && (
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <Ban className="w-3.5 h-3.5" /> Vendor dashboard is suspended.
              </p>
            )}

            {vendorDetail?.application ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Store name" value={vendorDetail.application.storeInfo?.name} />
                  <Field label="Plan" value={<span className="capitalize">{vendorDetail.application.selectedPlan}</span>} />
                  <Field label="Billing" value={<span className="capitalize">{vendorDetail.application.billingCycle}</span>} />
                  <Field label="Category" value={vendorDetail.application.storeInfo?.category} />
                  <Field
                    label="Business type"
                    value={vendorDetail.application.verification?.businessType}
                  />
                  <Field
                    label="Registration no."
                    value={vendorDetail.application.verification?.registrationNumber}
                  />
                </div>

                {vendorDetail.application.businessAddress?.city && (
                  <p className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                    <MapPin className="w-3.5 h-3.5" />
                    {vendorDetail.application.businessAddress.address
                      ? `${vendorDetail.application.businessAddress.address}, `
                      : ""}
                    {vendorDetail.application.businessAddress.city}
                    {vendorDetail.application.businessAddress.country
                      ? `, ${vendorDetail.application.businessAddress.country}`
                      : ""}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-[var(--border-color)]">
                  {vendorDetail.store?.slug && (
                    <Link
                      href={`/shop/${vendorDetail.store.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View storefront
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/admin/vendors/${vendorDetail.application._id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <Star className="w-3.5 h-3.5" /> Open vendor application review
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-xs text-[var(--foreground-muted)]">
                No vendor application on file for this account.
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
