"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Input,
  Button,
  Select,
  ListBox,
  Modal,
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
  Trash2,
  Eye,
  Copy,
  Check,
  ShoppingBag,
  ExternalLink,
  Package,
} from "lucide-react";
import { toast } from "react-toastify";
import { updateUser } from "@/lib/action/user";
import { getUserOrdersAction } from "@/lib/action/orders";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";

const ROLE_OPTIONS = [
  { id: "admin", label: "Admin", icon: ShieldCheck, desc: "Full administrative access to the platform" },
  { id: "customer", label: "Customer", icon: UserIcon, desc: "Standard shopper and customer access" },
];

const STATUS_OPTIONS = [
  { id: "active", label: "Active", icon: CheckCircle2, desc: "Account is active and in good standing" },
  { id: "suspended", label: "Suspended", icon: Ban, desc: "Account is restricted and cannot place orders" },
];

const FILTER_TABS = ["All", "Admin", "Customer"];
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

interface UserItem {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  image?: string;
  avatar?: string;
  role?: string;
  status?: string;
  member?: string;
  points?: number;
  createdAt?: string;
  updatedAt?: string;
  emailVerified?: boolean;
}

interface UsersClientProps {
  initialUsers: UserItem[];
  pagination: PaginationMeta;
}

// Safe avatar component that gracefully falls back to initials
function SafeAvatar({
  src,
  name,
  size = 32,
  className = "",
  rounded = "rounded-full",
}: {
  src?: string | null;
  name?: string;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const initial = (name || "U").trim().charAt(0).toUpperCase() || "U";

  // Reset error state if image source changes
  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = typeof src === "string" ? src.trim() : "";
  const isValidSrc =
    cleanSrc.length > 0 &&
    cleanSrc !== "undefined" &&
    cleanSrc !== "null" &&
    !cleanSrc.includes("[object Object]") &&
    !hasError;

  if (!isValidSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-tr from-sky-500 to-blue-600 text-white font-bold shrink-0 select-none shadow-xs ${rounded} ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size * 0.38)) }}
      >
        <span>{initial}</span>
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden shadow-xs ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={cleanSrc}
        alt={name || "User"}
        className={`w-full h-full object-cover ${rounded}`}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

// Safe product image component that falls back to placeholder
function SafeProductImage({
  src,
  alt,
  size = 44,
  className = "",
}: {
  src?: string | null;
  alt?: string;
  size?: number;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const cleanSrc = typeof src === "string" ? src.trim() : "";
  const isValidSrc =
    cleanSrc.length > 0 &&
    cleanSrc !== "undefined" &&
    cleanSrc !== "null" &&
    !cleanSrc.includes("[object Object]") &&
    !hasError;

  if (!isValidSrc) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-gray-400 shrink-0 rounded-lg ${className}`}
        style={{ width: size, height: size }}
      >
        <ShoppingBag className="w-5 h-5 text-gray-400" />
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={cleanSrc}
        alt={alt || "Product"}
        className="w-full h-full object-contain p-1"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

export default function UsersClient({
  initialUsers = [],
  pagination,
}: UsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { guardDemo } = useDemoAdmin();
  const [isPending, startTransition] = useTransition();

  const [users, setUsers] = useState<UserItem[]>(initialUsers);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // User orders state for modal
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

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

  // Open modal with user details & fetch their purchased products
  const handleOpenModal = async (user: UserItem) => {
    setSelectedUser(user);
    setIsModalOpen(true);
    setCopiedId(false);

    const userId = user._id || user.id;
    if (userId) {
      setLoadingOrders(true);
      try {
        const orders = await getUserOrdersAction(userId);
        setUserOrders(Array.isArray(orders) ? orders : []);
      } catch (err) {
        setUserOrders([]);
      } finally {
        setLoadingOrders(false);
      }
    } else {
      setUserOrders([]);
    }
  };

  const copyUserId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success("User ID copied to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Role change
  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!userId || !newRole) return;
    if (guardDemo()) return;
    setIsUpdating(true);
    try {
      const res = await updateUser(userId, { role: newRole });
      if (res?.success !== false) {
        toast.success(`Role updated to ${newRole.toUpperCase()}`);
        setUsers((prev) =>
          prev.map((u) => ((u._id || u.id) === userId ? { ...u, role: newRole } : u))
        );
        if (selectedUser && (selectedUser._id || selectedUser.id) === userId) {
          setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : null));
        }
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update role");
      }
    } catch {
      toast.error("Error updating user role");
    } finally {
      setIsUpdating(false);
    }
  };

  // Status change
  const handleStatusChange = async (userId: string, newStatus: string) => {
    if (!userId || !newStatus) return;
    if (guardDemo()) return;
    setIsUpdating(true);
    try {
      const res = await updateUser(userId, { status: newStatus });
      if (res?.success !== false) {
        toast.success(`Status updated to ${newStatus.toUpperCase()}`);
        setUsers((prev) =>
          prev.map((u) => ((u._id || u.id) === userId ? { ...u, status: newStatus } : u))
        );
        if (selectedUser && (selectedUser._id || selectedUser.id) === userId) {
          setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch {
      toast.error("Error updating user status");
    } finally {
      setIsUpdating(false);
    }
  };

  // Extract all purchased items across user's orders
  const purchasedProducts = userOrders.flatMap((order: any) =>
    (order.items || []).map((item: any) => ({
      ...item,
      orderId: order._id || order.id,
      orderStatus: order.orderStatus || order.status || "processing",
      orderDate: order.createdAt,
    }))
  );

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
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/dashboard/admin" className="hover:text-sky-600 transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-sky-600 dark:text-sky-400">Users</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Manage{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Users
            </span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Click on any user row to view complete profile details, purchase history, and control status & role.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/60 dark:border-sky-800/40 text-xs font-bold text-sky-700 dark:text-sky-300">
            Total Users: <span className="font-extrabold text-sky-600 dark:text-white">{total}</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-800/80 pb-4">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
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
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs"
                      : "bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200/60 dark:border-gray-700"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">
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
                      : "bg-slate-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200/60 dark:border-gray-700"
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
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-4 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs cursor-pointer shrink-0"
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
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs">
                  <Select.Value className="text-xs font-semibold truncate" />
                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                </Select.Trigger>
                <Select.Popover className="w-52 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                  <ListBox>
                    {SORT_OPTIONS.map((opt) => (
                      <ListBox.Item
                        key={opt.key}
                        id={opt.key}
                        textValue={opt.label}
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
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
                className="h-10 px-3 rounded-xl bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xs font-semibold cursor-pointer flex items-center gap-1"
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
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-gray-500">Loading users...</p>
        </Card>
      ) : users.length === 0 ? (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No users found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentSearch
                ? "No users matched your search query."
                : "There are currently no users matching the selected filters."}
            </p>
          </div>
          {(currentSearch || currentRoleTab !== "All" || currentStatusTab !== "All") && (
            <Button
              onPress={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Filters
            </Button>
          )}
        </Card>
      ) : (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/40 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
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
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60 text-xs">
                {users.map((user) => {
                  const id = user._id || user.id || "";
                  const name = user.name || "Unknown User";
                  const email = user.email || "—";
                  const avatarUrl =
                    user.image ||
                    user.avatar ||
                    (user as any).picture ||
                    (user as any).photoUrl;
                  const role = (user.role || "customer").toLowerCase();
                  const status = (user.status || "active").toLowerCase();
                  const dateStr = user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={id}
                      onClick={() => handleOpenModal(user)}
                      className="hover:bg-slate-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer group"
                    >
                      {/* User Avatar & Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <SafeAvatar
                            src={avatarUrl}
                            name={name}
                            size={32}
                            rounded="rounded-full"
                          />
                          <p className="font-bold text-gray-900 dark:text-white truncate max-w-[150px] group-hover:text-sky-600 transition-colors">
                            {name}
                          </p>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 truncate max-w-[180px]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{email}</span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            role === "admin"
                              ? "bg-violet-50 dark:bg-violet-950/70 text-violet-600 dark:text-violet-300 border-violet-200/80 dark:border-violet-800/60"
                              : "bg-sky-50 dark:bg-sky-950/70 text-sky-600 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60"
                          }`}
                        >
                          {role === "admin" ? (
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <UserIcon className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span className="capitalize">{role}</span>
                        </span>
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
                      <td className="py-3.5 px-4 whitespace-nowrap capitalize text-gray-700 dark:text-gray-300 font-semibold">
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 font-medium">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          {user.member || "Standard"}
                        </span>
                      </td>

                      {/* Points */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap font-extrabold text-gray-900 dark:text-white">
                        <div className="inline-flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          {user.points ?? 0}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 whitespace-nowrap text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
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
                            onPress={() => handleOpenModal(user)}
                            aria-label={`View ${name}`}
                            className="w-8 h-8 rounded-lg text-gray-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 cursor-pointer transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Table Footer & Pagination ── */}
          <div className="p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-bold text-gray-900 dark:text-white">
                {startItem}–{endItem}
              </span>{" "}
              of{" "}
              <span className="font-bold text-gray-900 dark:text-white">{total}</span> users
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
                        <span key={`ellipsis-${idx}`} className="px-2 text-xs text-gray-400">
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
                            ? "bg-sky-500 text-white shadow-xs"
                            : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200/80 dark:border-gray-700"
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

      {/* ── User Details, Purchased Products & Control Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
      >
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              {selectedUser && (
                <>
                  {/* Modal Header */}
                  <Modal.Header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-gray-800 pb-5">
                    <div className="flex items-center gap-3.5">
                      <SafeAvatar
                        src={
                          selectedUser.image ||
                          selectedUser.avatar ||
                          (selectedUser as any).picture ||
                          (selectedUser as any).photoUrl
                        }
                        name={selectedUser.name}
                        size={56}
                        rounded="rounded-2xl"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <Modal.Heading className="text-lg font-extrabold text-gray-900 dark:text-white">
                            {selectedUser.name || "User Profile"}
                          </Modal.Heading>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              (selectedUser.status || "active").toLowerCase() === "active"
                                ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400"
                                : "bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400"
                            }`}
                          >
                            {selectedUser.status || "Active"}
                          </span>
                        </div>

                        {/* Full User ID with Copy Button */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2 py-0.5 rounded-md select-all">
                            ID: {selectedUser._id || selectedUser.id}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyUserId(selectedUser._id || selectedUser.id || "")}
                            className="p-1 rounded-md text-gray-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                            title="Copy User ID"
                          >
                            {copiedId ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <Modal.CloseTrigger className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 self-end sm:self-auto transition-colors">
                      ✕
                    </Modal.CloseTrigger>
                  </Modal.Header>

                  {/* Modal Body */}
                  <Modal.Body className="space-y-6">
                    {/* User Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate" title={selectedUser.email}>
                          {selectedUser.email || "—"}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Tier</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white capitalize truncate">
                          {selectedUser.member || "Standard"}
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>Points</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {selectedUser.points ?? 0} pts
                        </p>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 space-y-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Joined</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {selectedUser.createdAt
                            ? new Date(selectedUser.createdAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>

                    {/* Status & Role Controls */}
                    <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-gray-800/40 border border-slate-200/70 dark:border-gray-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                          Account Role & Status Controls
                        </h4>
                        {isUpdating && (
                          <span className="text-[11px] font-semibold text-sky-500 animate-pulse">
                            Updating...
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {/* Role Select Control */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                            User Role
                          </label>
                          <Select
                            aria-label="Change Role"
                            placeholder="Select Role"
                            selectedKey={(selectedUser.role || "customer").toLowerCase() === "admin" ? "admin" : "customer"}
                            onSelectionChange={(key) => {
                              if (key) {
                                handleRoleChange(selectedUser._id || selectedUser.id!, String(key));
                              }
                            }}
                            isDisabled={isUpdating}
                          >
                            <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between gap-2 cursor-pointer hover:border-violet-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-bold [&>span]:truncate [&>span]:text-left">
                              <Select.Value className="text-xs font-bold capitalize truncate flex-1 text-left" />
                              <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                            </Select.Trigger>
                            <Select.Popover className="w-(--trigger-width) min-w-[200px] p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                              <ListBox>
                                {ROLE_OPTIONS.map((opt) => (
                                  <ListBox.Item
                                    key={opt.id}
                                    id={opt.id}
                                    textValue={opt.label}
                                    className="text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <opt.icon className="w-3.5 h-3.5 text-violet-500" />
                                      <span>{opt.label}</span>
                                    </div>
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>

                        {/* Status Select Control */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-gray-600 dark:text-gray-400">
                            Account Status
                          </label>
                          <Select
                            aria-label="Change Status"
                            placeholder="Select Status"
                            selectedKey={(selectedUser.status || "active").toLowerCase() === "suspended" ? "suspended" : "active"}
                            onSelectionChange={(key) => {
                              if (key) {
                                handleStatusChange(selectedUser._id || selectedUser.id!, String(key));
                              }
                            }}
                            isDisabled={isUpdating}
                          >
                            <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between gap-2 cursor-pointer hover:border-emerald-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-bold [&>span]:truncate [&>span]:text-left">
                              <Select.Value className="text-xs font-bold capitalize truncate flex-1 text-left" />
                              <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                            </Select.Trigger>
                            <Select.Popover className="w-(--trigger-width) min-w-[200px] p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                              <ListBox>
                                {STATUS_OPTIONS.map((opt) => (
                                  <ListBox.Item
                                    key={opt.id}
                                    id={opt.id}
                                    textValue={opt.label}
                                    className="text-xs font-semibold px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-2">
                                      <opt.icon className="w-3.5 h-3.5 text-emerald-500" />
                                      <span>{opt.label}</span>
                                    </div>
                                    <ListBox.ItemIndicator />
                                  </ListBox.Item>
                                ))}
                              </ListBox>
                            </Select.Popover>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Customer's Ordered Products Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                          <Package className="w-4 h-4 text-sky-500" />
                          <span>Purchased Products ({purchasedProducts.length})</span>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-400">
                          {userOrders.length} {userOrders.length === 1 ? "Order" : "Orders"}
                        </span>
                      </div>

                      {loadingOrders ? (
                        <div className="p-8 text-center bg-slate-50 dark:bg-gray-800/30 rounded-2xl border border-slate-100 dark:border-gray-800">
                          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          <p className="text-xs text-gray-400">Loading purchase history...</p>
                        </div>
                      ) : purchasedProducts.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 dark:bg-gray-800/30 rounded-2xl border border-slate-100 dark:border-gray-800 space-y-1">
                          <ShoppingBag className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-400">
                            No orders placed yet
                          </p>
                          <p className="text-[11px] text-gray-400">
                            This customer has not made any purchases on the store.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {purchasedProducts.map((prod, idx) => {
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
                            const pDate = prod.orderDate
                              ? new Date(prod.orderDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—";

                            return (
                              <div
                                key={`${prod.orderId}-${idx}`}
                                className="p-2.5 rounded-xl bg-slate-50 dark:bg-gray-800/50 border border-slate-100 dark:border-gray-700/50 flex items-center justify-between gap-3 hover:bg-slate-100/80 dark:hover:bg-gray-800 transition-colors"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <SafeProductImage
                                    src={pImage}
                                    alt={pTitle}
                                    size={44}
                                  />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                      {pTitle}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                                        ${pPrice.toFixed(2)}
                                      </span>
                                      <span>•</span>
                                      <span>Qty: {pQty}</span>
                                      <span>•</span>
                                      <span className="capitalize text-[10px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/60 px-1.5 py-0.2 rounded">
                                        {prod.orderStatus}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] text-gray-400 hidden sm:inline">
                                    {pDate}
                                  </span>
                                  {pSlug && (
                                    <Link
                                      href={`/shop/${pSlug}`}
                                      target="_blank"
                                      className="p-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-gray-600 transition-colors shadow-2xs"
                                      title="View Product in Store"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </Modal.Body>

                  {/* Modal Footer */}
                  <Modal.Footer className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                    <Button
                      size="sm"
                      onPress={() => setIsModalOpen(false)}
                      className="px-5 h-9 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold text-xs cursor-pointer"
                    >
                      Close
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
