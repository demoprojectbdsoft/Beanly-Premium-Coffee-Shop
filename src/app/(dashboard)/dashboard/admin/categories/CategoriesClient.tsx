"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Card,
  Input,
  TextArea,
  Button,
  Select,
  ListBox,
  Switch,
  Modal,
} from "@heroui/react";
import {
  FolderTree,
  Plus,
  Search,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronRight,
  Folder,
  Layers,
  Check,
  AlertTriangle,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import { Category, SubCategory } from "@/types";
import { updateCategory, deleteCategory } from "@/lib/action/categories";
import { updateSubCategory, deleteSubCategory } from "@/lib/action/subCategories";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";

interface CategoriesClientProps {
  initialCategories: Category[];
  initialSubCategories: SubCategory[];
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CategoriesClient({
  initialCategories = [],
  initialSubCategories = [],
}: CategoriesClientProps) {
  const router = useRouter();
  const { guardDemo } = useDemoAdmin();

  const [categories, setCategories] = useState<Category[]>(
    Array.isArray(initialCategories) ? initialCategories : []
  );
  const [subCategories, setSubCategories] = useState<SubCategory[]>(
    Array.isArray(initialSubCategories) ? initialSubCategories : []
  );

  useEffect(() => {
    setCategories(Array.isArray(initialCategories) ? initialCategories : []);
  }, [initialCategories]);

  useEffect(() => {
    setSubCategories(Array.isArray(initialSubCategories) ? initialSubCategories : []);
  }, [initialSubCategories]);

  // Expanded categories (accordions)
  const [expandedCatIds, setExpandedCatIds] = useState<Set<string>>(
    () => new Set((Array.isArray(initialCategories) ? initialCategories : []).map((c) => (c._id || c.id || c.slug) as string))
  );

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTargetType, setEditTargetType] = useState<"category" | "subcategory">("category");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubCategory, setEditingSubCategory] = useState<SubCategory | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Confirmation Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "subcategory";
    item: Category | SubCategory;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle category expand/collapse
  const toggleExpand = (catId: string) => {
    setExpandedCatIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCatIds(new Set(categories.map((c) => (c._id || c.id || c.slug) as string)));
  };

  const collapseAll = () => {
    setExpandedCatIds(new Set());
  };

  // Group subcategories by categoryId
  const subCategoryMap = useMemo(() => {
    const map = new Map<string, SubCategory[]>();
    subCategories.forEach((sub) => {
      const catId = String(sub.categoryId);
      const list = map.get(catId) || [];
      list.push(sub);
      map.set(catId, list);
    });
    return map;
  }, [subCategories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => {
      const catId = (cat._id || cat.id || cat.slug) as string;
      const childSubs = subCategoryMap.get(String(catId)) || [];

      // Status filter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? cat.isActive !== false : cat.isActive === false);

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesStatus;

      const catMatch =
        cat.name.toLowerCase().includes(q) ||
        cat.slug.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q));

      const subMatch = childSubs.some(
        (sub) =>
          sub.name.toLowerCase().includes(q) ||
          sub.slug.toLowerCase().includes(q) ||
          (sub.description && sub.description.toLowerCase().includes(q))
      );

      return (catMatch || subMatch) && matchesStatus;
    });
  }, [categories, subCategoryMap, searchQuery, statusFilter]);

  // Open Edit Modal
  const handleOpenEditCategory = (cat: Category) => {
    setEditTargetType("category");
    setEditingCategory({ ...cat });
    setEditingSubCategory(null);
    setIsEditOpen(true);
  };

  const handleOpenEditSubCategory = (sub: SubCategory) => {
    setEditTargetType("subcategory");
    setEditingSubCategory({ ...sub });
    setEditingCategory(null);
    setIsEditOpen(true);
  };

  // Submit Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardDemo()) return;
    setIsUpdating(true);

    try {
      if (editTargetType === "category" && editingCategory) {
        const id = (editingCategory._id || editingCategory.id) as string;
        const res = await updateCategory(id, {
          name: editingCategory.name,
          slug: editingCategory.slug,
          description: editingCategory.description,
          image: editingCategory.image,
          isActive: editingCategory.isActive,
        });

        if (res?.success !== false) {
          toast.success("Category updated successfully!");
          setCategories((prev) =>
            prev.map((c) =>
              (c._id || c.id) === id ? { ...c, ...editingCategory } : c
            )
          );
          setIsEditOpen(false);
          router.refresh();
        } else {
          toast.error(res?.message || "Failed to update category");
        }
      } else if (editTargetType === "subcategory" && editingSubCategory) {
        const id = (editingSubCategory._id || editingSubCategory.id) as string;
        const res = await updateSubCategory(id, {
          categoryId: editingSubCategory.categoryId,
          name: editingSubCategory.name,
          slug: editingSubCategory.slug,
          description: editingSubCategory.description,
          image: editingSubCategory.image,
          isActive: editingSubCategory.isActive,
        });

        if (res?.success !== false) {
          toast.success("Subcategory updated successfully!");
          setSubCategories((prev) =>
            prev.map((s) =>
              (s._id || s.id) === id ? { ...s, ...editingSubCategory } : s
            )
          );
          setIsEditOpen(false);
          router.refresh();
        } else {
          toast.error(res?.message || "Failed to update subcategory");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving changes");
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Confirmation
  const handleOpenDelete = (
    type: "category" | "subcategory",
    item: Category | SubCategory
  ) => {
    setDeleteTarget({ type, item });
    setIsDeleteOpen(true);
  };

  // Confirm Delete Action
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    if (guardDemo()) return;
    setIsDeleting(true);

    try {
      const id = (deleteTarget.item._id || deleteTarget.item.id) as string;

      if (deleteTarget.type === "category") {
        const res = await deleteCategory(id);
        if (res?.success !== false) {
          toast.success("Category and linked subcategories deleted!");
          setCategories((prev) => prev.filter((c) => (c._id || c.id) !== id));
          setSubCategories((prev) =>
            prev.filter((s) => String(s.categoryId) !== String(id))
          );
          setIsDeleteOpen(false);
          router.refresh();
        } else {
          toast.error(res?.message || "Failed to delete category");
        }
      } else {
        const res = await deleteSubCategory(id);
        if (res?.success !== false) {
          toast.success("Subcategory deleted!");
          setSubCategories((prev) => prev.filter((s) => (s._id || s.id) !== id));
          setIsDeleteOpen(false);
          router.refresh();
        } else {
          toast.error(res?.message || "Failed to delete subcategory");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting item");
    } finally {
      setIsDeleting(false);
    }
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
            <span className="text-sky-600 dark:text-sky-400">Categories</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Category{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Management
            </span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Organize catalog hierarchy with categories and nested subcategories.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/dashboard/admin/categories/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Category / Subcategory</span>
          </Link>
        </div>
      </div>

      {/* ── Toolbar: Search, Filters & Expand Actions ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar */}
          <div className="relative min-w-[260px] sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category or subcategory..."
              className="w-full pl-9 pr-4 h-10 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-xl text-xs"
            />
          </div>

          {/* Status filter buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800">
            {(["all", "active", "inactive"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 font-semibold transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 font-semibold transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* ── Categories & Subcategories Nested Table / Tree ── */}
      {filteredCategories.length === 0 ? (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
            <FolderTree className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No categories found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "Try adjusting your search query or status filter."
                : "Get started by adding your first product category."}
            </p>
          </div>
          <Link
            href="/dashboard/admin/categories/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Category</span>
          </Link>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/40 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="py-3.5 px-4 w-12 text-center">Tree</th>
                  <th className="py-3.5 px-4">Category / Subcategory</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60 text-xs">
                {filteredCategories.map((category) => {
                  const catId = (category._id || category.id || category.slug) as string;
                  const childSubs = subCategoryMap.get(String(catId)) || [];
                  const isExpanded = expandedCatIds.has(catId);
                  const hasSubs = childSubs.length > 0;
                  const imgUrl = typeof category.image === "string" ? category.image : "";

                  return (
                    <React.Fragment key={catId}>
                      {/* ── Category Row ── */}
                      <tr className="hover:bg-slate-50/70 dark:hover:bg-gray-800/30 transition-colors group bg-white dark:bg-gray-900">
                        {/* Expand toggle icon */}
                        <td className="py-3.5 px-4 text-center">
                          {hasSubs ? (
                            <button
                              onClick={() => toggleExpand(catId)}
                              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-500 transition-colors cursor-pointer"
                              title={isExpanded ? "Collapse" : "Expand"}
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                            </button>
                          ) : (
                            <span className="inline-block w-4 h-4 text-gray-300 text-center">•</span>
                          )}
                        </td>

                        {/* Name & Thumbnail */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                              {imgUrl ? (
                                <Image
                                  src={imgUrl}
                                  alt={category.name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                <Folder className="w-5 h-5 text-sky-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 dark:text-white text-sm">
                                  {category.name}
                                </span>
                                {hasSubs && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/40">
                                    {childSubs.length} subcategories
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-400 font-medium">
                                Primary Category
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Slug */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-400">
                          /{category.slug}
                        </td>

                        {/* Description */}
                        <td className="py-3.5 px-4 max-w-xs text-gray-500 dark:text-gray-400 truncate">
                          {category.description || <span className="italic text-gray-400">No description</span>}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          {category.isActive !== false ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
                              <XCircle className="w-3 h-3" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditCategory(category)}
                              className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete("category", category)}
                              className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Subcategories Nested Rows ── */}
                      {isExpanded &&
                        childSubs.map((sub, idx) => {
                          const subId = (sub._id || sub.id || sub.slug) as string;
                          const subImgUrl = typeof sub.image === "string" ? sub.image : "";
                          const isLast = idx === childSubs.length - 1;

                          return (
                            <tr
                              key={subId}
                              className="bg-slate-50/50 dark:bg-gray-800/20 hover:bg-slate-100/60 dark:hover:bg-gray-800/50 transition-colors"
                            >
                              {/* Subcategory connector line */}
                              <td className="py-3 px-4 text-center">
                                <span className="text-gray-300 dark:text-gray-600 font-mono">
                                  {isLast ? "└" : "├"}
                                </span>
                              </td>

                              {/* Subcategory Name & Thumbnail */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3 pl-4">
                                  <div className="relative w-8 h-8 rounded-lg bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
                                    {subImgUrl ? (
                                      <Image
                                        src={subImgUrl}
                                        alt={sub.name}
                                        fill
                                        sizes="32px"
                                        className="object-cover"
                                        unoptimized
                                      />
                                    ) : (
                                      <Layers className="w-4 h-4 text-blue-500" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                      {sub.name}
                                    </span>
                                    <p className="text-[10px] text-gray-400">
                                      under {category.name}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Slug */}
                              <td className="py-3 px-4 font-mono text-[11px] text-gray-500 dark:text-gray-400">
                                /{sub.slug}
                              </td>

                              {/* Description */}
                              <td className="py-3 px-4 max-w-xs text-gray-500 dark:text-gray-400 truncate">
                                {sub.description || (
                                  <span className="italic text-gray-400">No description</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4 text-center">
                                {sub.isActive !== false ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
                                    Inactive
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleOpenEditSubCategory(sub)}
                                    className="p-1.5 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors cursor-pointer"
                                    title="Edit Subcategory"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenDelete("subcategory", sub)}
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                    title="Delete Subcategory"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          EDIT MODAL (HeroUI v3 Modal)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isEditOpen} onOpenChange={setIsEditOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <Modal.Header className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-4">
                <Modal.Heading className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-sky-500" />
                  Edit {editTargetType === "category" ? "Category" : "Subcategory"}
                </Modal.Heading>
                <Modal.CloseTrigger className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-lg">
                  ✕
                </Modal.CloseTrigger>
              </Modal.Header>

              <Modal.Body>
                <form onSubmit={handleSaveEdit} id="edit-cat-form" className="space-y-5">
                  {/* For subcategory: parent category select */}
                  {editTargetType === "subcategory" && editingSubCategory && (
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Parent Category <span className="text-rose-500">*</span>
                      </label>
                      <Select
                        selectedKey={String(editingSubCategory.categoryId) || null}
                        onSelectionChange={(key) =>
                          setEditingSubCategory((prev) =>
                            prev ? { ...prev, categoryId: String(key) } : prev
                          )
                        }
                        placeholder="Select parent category"
                        isRequired
                      >
                        <Select.Trigger className="w-full cursor-pointer">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {categories.map((cat) => {
                              const cId = (cat._id || cat.id || cat.slug) as string;
                              return (
                                <ListBox.Item key={cId} id={cId} textValue={cat.name} className="cursor-pointer">
                                  {cat.name}
                                </ListBox.Item>
                              );
                            })}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                  )}

                  {/* Name + Slug */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Name <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={
                          editTargetType === "category"
                            ? editingCategory?.name || ""
                            : editingSubCategory?.name || ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (editTargetType === "category") {
                            setEditingCategory((prev) =>
                              prev ? { ...prev, name: val, slug: generateSlug(val) } : prev
                            );
                          } else {
                            setEditingSubCategory((prev) =>
                              prev ? { ...prev, name: val, slug: generateSlug(val) } : prev
                            );
                          }
                        }}
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Slug <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={
                          editTargetType === "category"
                            ? editingCategory?.slug || ""
                            : editingSubCategory?.slug || ""
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (editTargetType === "category") {
                            setEditingCategory((prev) => (prev ? { ...prev, slug: val } : prev));
                          } else {
                            setEditingSubCategory((prev) => (prev ? { ...prev, slug: val } : prev));
                          }
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <TextArea
                      value={
                        editTargetType === "category"
                          ? editingCategory?.description || ""
                          : editingSubCategory?.description || ""
                      }
                      onChange={(e) => {
                        const val = e.target.value;
                        if (editTargetType === "category") {
                          setEditingCategory((prev) => (prev ? { ...prev, description: val } : prev));
                        } else {
                          setEditingSubCategory((prev) => (prev ? { ...prev, description: val } : prev));
                        }
                      }}
                      rows={3}
                    />
                  </div>

                  {/* Thumbnail Image */}
                  <ImageUploader
                    label="Thumbnail Image"
                    name="image"
                    value={
                      editTargetType === "category"
                        ? typeof editingCategory?.image === "string"
                          ? editingCategory.image
                          : ""
                        : typeof editingSubCategory?.image === "string"
                          ? editingSubCategory.image
                          : ""
                    }
                    onChange={(url) => {
                      if (editTargetType === "category") {
                        setEditingCategory((prev) => (prev ? { ...prev, image: url } : prev));
                      } else {
                        setEditingSubCategory((prev) => (prev ? { ...prev, image: url } : prev));
                      }
                    }}
                  />

                  {/* Visibility Switch */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200/60 dark:border-gray-800">
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Visibility Status
                      </p>
                      <p className="text-[10px] text-gray-400">
                        Enable to show on storefront navigation
                      </p>
                    </div>
                    <Switch
                      isSelected={
                        editTargetType === "category"
                          ? editingCategory?.isActive !== false
                          : editingSubCategory?.isActive !== false
                      }
                      onChange={(val) => {
                        if (editTargetType === "category") {
                          setEditingCategory((prev) => (prev ? { ...prev, isActive: val } : prev));
                        } else {
                          setEditingSubCategory((prev) => (prev ? { ...prev, isActive: val } : prev));
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <Switch.Content className="cursor-pointer">
                        <Switch.Control className="cursor-pointer">
                          <Switch.Thumb className="cursor-pointer" />
                        </Switch.Control>
                      </Switch.Content>
                    </Switch>
                  </div>
                </form>
              </Modal.Body>

              <Modal.Footer className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                <Button
                  variant="outline"
                  onPress={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200 dark:border-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-cat-form"
                  isDisabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-sm cursor-pointer hover:opacity-95 transition-opacity"
                >
                  <Check className="w-4 h-4" />
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL (HeroUI v3 Modal)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/40">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Delete {deleteTarget?.type === "category" ? "Category" : "Subcategory"}?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-gray-800 dark:text-gray-200">
                    &ldquo;{deleteTarget?.item.name}&rdquo;
                  </span>
                  ?
                </p>

                {deleteTarget?.type === "category" && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-[11px] text-amber-800 dark:text-amber-300 text-left">
                    <p className="font-bold">⚠️ Cascading Delete:</p>
                    <p className="mt-0.5">
                      Deleting this category will also automatically delete all of its child
                      subcategories. (Blocked if active products exist).
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onPress={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-slate-200 dark:border-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  isDisabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? "Deleting..." : "Yes, Delete"}
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
