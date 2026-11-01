"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Input,
  Button,
  Select,
  ListBox,
} from "@heroui/react";
import {
  Users,
  Search,
  RotateCcw,
  ShieldCheck,
  User as UserIcon,
  CheckCircle2,
  Ban,
  Mail,
  Calendar,
  Sparkles,
  Award,
  ChevronDown,
  Bike,
  Store,
} from "lucide-react";
import { getUserAdminDetail } from "@/lib/action/user";
import { rolesOf, roleOf, suspendedRolesOf } from "@/lib/core/roles";
import UserAvatar from "@/components/shared/UserAvatar";
import UserDetailClient from "./[id]/UserDetailClient";

const FILTER_TABS = ["All", "Admin", "Customer", "Rider", "Vendor"];
const STATUS_FILTER_TABS = ["All", "Active", "Suspended"];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "name_asc", label: "Name: A to Z" },
  { key: "name_desc", label: "Name: Z to A" },
];

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface RoleSuspensionRow {
  role?: string;
  reason?: string;
  suspendedAt?: string;
}

interface UserItem {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  image?: string;
  avatar?: string;
  role?: string;
  activeRole?: string;
  roles?: string[] | string;
  roleSuspensions?: RoleSuspensionRow[];
  status?: string;
  member?: string;
  points?: number;
  createdAt?: string;
  updatedAt?: string;
  emailVerified?: boolean;
  vendorStatus?: string;
  riderStatus?: string;
}

interface UsersClientProps {
  initialUsers: UserItem[];
  pagination: PaginationMeta;
}

// ── Role chip visuals ───────────────────────────────────────────────
// One account can hold several approved roles. The table shows a chip for
// each: the dashboard the account is currently on gets a filled ring, and a
// role the store team parked is drawn muted with a Ban mark so an admin can
// tell "approved but closed" apart from a genuinely active workspace.
type RoleVisual = {
  icon: React.ComponentType<{ className?: string }>;
  chip: string;
};

function roleVisual(role: string): RoleVisual {
  switch (role) {
    case "admin":
    case "demoadmin":
      return {
        icon: ShieldCheck,
        chip: "bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/60",
      };
    case "rider":
      return {
        icon: Bike,
        chip: "bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60",
      };
    case "vendor":
      return {
        icon: Store,
        chip: "bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-300 border-teal-200/80 dark:border-teal-800/60",
      };
    default:
      return {
        icon: UserIcon,
        chip: "bg-[var(--accent)]/10 text-primary border-sky-200/80 dark:border-sky-800/60",
      };
  }
}

// Preferred display order so a multi-role row always reads the same way.
const ROLE_ORDER = ["admin", "demoadmin", "vendor", "rider", "customer"];

function orderRoles(list: string[]): string[] {
  return [...list].sort((a, b) => {
    const ia = ROLE_ORDER.indexOf(a);
    const ib = ROLE_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function RoleChips({ user }: { user: UserItem }) {
  const held = orderRoles(rolesOf(user));
  const active = roleOf(user);
  const suspended = suspendedRolesOf(user);

  if (held.length === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border-color)]">
        <UserIcon className="w-3.5 h-3.5 shrink-0" />
        <span>none</span>
      </span>
    );
  }

  return (
    <div className="inline-flex flex-wrap items-center justify-center gap-1">
      {held.map((role) => {
        const { icon: Icon, chip } = roleVisual(role);
        const isSuspended = role !== "customer" && suspended.includes(role);
        const isActive = role === active;
        return (
          <span
            key={role}
            title={
              isSuspended
                ? `${role} — suspended`
                : isActive
                  ? `${role} — active dashboard`
                  : role
            }
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition ${chip} ${
              isActive ? "ring-2 ring-[var(--accent)]/40" : ""
            } ${isSuspended ? "opacity-60" : ""}`}
          >
            {isSuspended ? (
              <Ban className="w-3 h-3 shrink-0" />
            ) : (
              <Icon className="w-3 h-3 shrink-0" />
            )}
            <span className={`capitalize ${isSuspended ? "line-through" : ""}`}>{role}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function UsersClient({
  initialUsers = [],
  pagination,
}: UsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState<UserItem[]>(initialUsers);

  // Inline detail: the one expanded row and the freshly-fetched bundle that
  // fills it. The bundle is pulled from the server on expand, so the panel
  // shows the same thing the standalone profile page does rather than the
  // trimmed summary this list already holds.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    user: Record<string, unknown>;
    orders: unknown[];
    vendorDetail: Record<string, unknown> | null;
    riderDetail: Record<string, unknown> | null;
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    setUsers(Array.isArray(initialUsers) ? initialUsers : []);
  }, [initialUsers]);

  const currentRoleTab = searchParams.get("role")
    ? searchParams.get("role")!.charAt(0).toUpperCase() + searchParams.get("role")!.slice(1).toLowerCase()
    : "All";
  const currentStatusTab = searchParams.get("status")
    ? searchParams.get("status")!.charAt(0).toUpperCase() + searchParams.get("status")!.slice(1).toLowerCase()
    : "All";
  const currentSearch = searchParams.get("search") || "";
  const currentSort = searchParams.get("sort") || "newest";

  const [searchInput, setSearchInput] = useState(currentSearch);

  useEffect(() => {
    setSearchInput(currentSearch);
  }, [currentSearch]);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, val]) => {
        if (
          val === undefined ||
          val === "" ||
          (key === "role" && val.toLowerCase() === "all") ||
          (key === "status" && val.toLowerCase() === "all")
        ) {
          params.delete(key);
        } else {
          params.set(key, val);
        }
      });

      if (!("page" in updates)) {
        params.delete("page");
      }

      const qs = params.toString();
      startTransition(() => {
        router.push(`/dashboard/admin/users${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateParams({ search: searchInput.trim() });
  };

  const handleResetFilters = () => {
    setSearchInput("");
    startTransition(() => {
      router.push("/dashboard/admin/users", { scroll: false });
    });
  };

  // Expand or collapse one row. Opening fetches the full account bundle from
  // the store API — the fresh user row, the purchase list, and any marketplace
  // applications — so the inline panel is authoritative, never a stale claim.
  const handleToggleRow = async (user: UserItem) => {
    const userId = user._id || user.id || "";
    if (!userId) return;

    if (expandedId === userId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }

    setExpandedId(userId);
    setDetail(null);
    setLoadingDetail(true);
    try {
      const bundle = await getUserAdminDetail(userId);
      if (bundle) setDetail(bundle);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  const { page, limit, total, totalPages } = pagination || {
    page: 1,
    limit: 10,
    total: users.length,
    totalPages: 1,
  };
  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Users</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Manage{" "}
            <span className="text-primary">
              Users
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Click any user row to expand their full profile — role controls, purchase history and rider/vendor details — right here on the page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            Total Users: <span className="font-extrabold text-primary">{total}</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider mr-1">
              Role:
            </span>
            {FILTER_TABS.map((tab) => {
              const isActive = currentRoleTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => updateParams({ role: tab === "All" ? undefined : tab.toLowerCase() })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-white shadow-xs font-bold"
                      : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]/80 hover:text-[var(--foreground)] border border-[var(--border-color)]"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider mr-1">
              Status:
            </span>
            {STATUS_FILTER_TABS.map((tab) => {
              const isActive = currentStatusTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => updateParams({ status: tab === "All" ? undefined : tab.toLowerCase() })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs"
                      : "bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--foreground-muted)] border border-[var(--border-color)]/60 dark:border-[var(--border-color)]"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search, Sort & Reset */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 h-10 bg-[var(--surface-alt)] dark:bg-[var(--surface)] border border-[var(--border-color)] rounded-xl text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs cursor-pointer shrink-0"
            >
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="w-48">
              <Select
                aria-label="Sort Users"
                selectedKey={currentSort}
                onSelectionChange={(key) => updateParams({ sort: key ? String(key) : "newest" })}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-semibold text-[var(--foreground-secondary)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs">
                  <Select.Value className="text-xs font-semibold truncate" />
                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
                </Select.Trigger>
                <Select.Popover className="w-52 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50">
                  <ListBox>
                    {SORT_OPTIONS.map((opt) => (
                      <ListBox.Item
                        key={opt.key}
                        id={opt.key}
                        textValue={opt.label}
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground)] cursor-pointer flex items-center justify-between"
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {(currentSearch || currentRoleTab !== "All" || currentStatusTab !== "All" || currentSort !== "newest") && (
              <Button
                size="sm"
                variant="secondary"
                onPress={handleResetFilters}
                className="h-10 px-3 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:hover:text-[var(--foreground)] text-xs font-semibold cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Users Table ── */}
      {isPending ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Loading users...</p>
        </Card>
      ) : users.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              No users found
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {currentSearch
                ? "No users matched your search query."
                : "There are currently no users matching the selected filters."}
            </p>
          </div>
          {(currentSearch || currentRoleTab !== "All" || currentStatusTab !== "All") && (
            <Button
              onPress={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-hover rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)]/80 dark:bg-[var(--surface-alt)]/40 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4 text-center">Role</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Member Tier</th>
                  <th className="py-3.5 px-4 text-right">Points</th>
                  <th className="py-3.5 px-4">Joined Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {users.map((user) => {
                  const id = user._id || user.id || "";
                  const name = user.name || "Unknown User";
                  const email = user.email || "—";
                  const avatarUrl =
                    user.image ||
                    user.avatar ||
                    (user as any).picture ||
                    (user as any).photoUrl;
                  const status = (user.status || "active").toLowerCase();
                  const dateStr = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  const isExpanded = expandedId === id;
                  return (
                    <React.Fragment key={id}>
                      <tr
                        onClick={() => handleToggleRow(user)}
                        className={`transition-colors cursor-pointer group ${
                          isExpanded
                            ? "bg-[var(--surface-alt)]"
                            : "hover:bg-[var(--surface-alt)]/80 dark:hover:bg-[var(--surface)]/40"
                        }`}
                      >
                        {/* User Avatar & Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <UserAvatar
                              src={avatarUrl}
                              name={name}
                              size={32}
                              className="rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-xs"
                            />
                            <p className="font-bold text-[var(--foreground)] truncate max-w-[150px] group-hover:text-primary transition-colors">
                              {name}
                            </p>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="py-3.5 px-4 text-[var(--foreground-muted)] truncate max-w-[180px]">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[var(--foreground-muted)] shrink-0" />
                            <span className="truncate">{email}</span>
                          </div>
                        </td>

                        {/* Role Badges — one chip per approved role */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <RoleChips user={user} />
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                              status === "active"
                                ? "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60"
                                : "bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60"
                            }`}
                          >
                            {status === "active" ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Ban className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span className="capitalize">{status}</span>
                          </span>
                        </td>

                        {/* Member Tier */}
                        <td className="py-3.5 px-4 whitespace-nowrap capitalize text-[var(--foreground)] font-semibold">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-[var(--surface-alt)] font-medium">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            {user.member || "Standard"}
                          </span>
                        </td>

                        {/* Points */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap font-extrabold text-[var(--foreground)]">
                          <div className="inline-flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-amber-500" />
                            {user.points ?? 0}
                          </div>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-[var(--foreground-muted)] whitespace-nowrap text-[11px]">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                            {dateStr}
                          </div>
                        </td>

                        {/* Actions */}
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="ghost"
                              onPress={() => handleToggleRow(user)}
                              aria-label={isExpanded ? `Hide ${name}` : `View ${name}`}
                              className="w-8 h-8 rounded-lg text-[var(--foreground-muted)] hover:text-primary hover:bg-primary/10 cursor-pointer transition-colors"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180 text-primary" : ""}`}
                              />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={8}
                            className="p-0 bg-[var(--surface-alt)]/40 dark:bg-[var(--surface)]/20 border-t border-[var(--border-color)]"
                          >
                            <div className="p-4 sm:p-5">
                              {loadingDetail ? (
                                <div className="py-10 text-center">
                                  <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                  <p className="text-xs font-semibold text-[var(--foreground-muted)]">
                                    Loading profile…
                                  </p>
                                </div>
                              ) : detail ? (
                                <UserDetailClient
                                  key={id}
                                  variant="inline"
                                  user={detail.user as any}
                                  orders={detail.orders as any}
                                  vendorDetail={detail.vendorDetail as any}
                                  riderDetail={detail.riderDetail as any}
                                />
                              ) : (
                                <p className="py-8 text-center text-xs text-[var(--foreground-muted)]">
                                  Could not load this account’s details.
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer & Pagination ── */}
          <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/50 dark:bg-[var(--surface)]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--foreground-muted)]">
              Showing{" "}
              <span className="font-bold text-[var(--foreground)]">
                {startItem}–{endItem}
              </span>{" "}
              of{" "}
              <span className="font-bold text-[var(--foreground)]">{total}</span> users
            </p>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={page <= 1}
                  onPress={() => updateParams({ page: String(page - 1) })}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {getPageNumbers().map((p, idx) => {
                    if (p === "ellipsis") {
                      return (
                        <span key={`ellipsis-${idx}`} className="px-2 text-xs text-[var(--foreground-muted)]">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === page;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => updateParams({ page: String(p) })}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-xs"
                            : "bg-[var(--surface-elevated)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--foreground-muted)] border border-[var(--border-color)]/80 dark:border-[var(--border-color)]"
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  variant="secondary"
                  isDisabled={page >= totalPages}
                  onPress={() => updateParams({ page: String(page + 1) })}
                  className="h-8 px-2.5 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
