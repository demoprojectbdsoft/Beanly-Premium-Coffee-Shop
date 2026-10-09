"use client";

import React, { useState, useEffect, useMemo, useTransition, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  Input,
  TextArea,
  Button,
  Select,
  ListBox,
  Switch,
  Modal,
  Pagination,
} from "@heroui/react";
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Sparkles,
  DollarSign,
  Layers,
  Check,
  AlertTriangle,
  X,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  RotateCcw,
} from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";
import { Product, Category, SubCategory } from "@/types";
import { updateProduct, deleteProduct } from "@/lib/action/products";

const AVAILABLE_BADGES = [
  { id: "new", label: "New" },
  { id: "hot", label: "Hot" },
  { id: "popular", label: "Popular" },
  { id: "trending", label: "Trending" },
  { id: "top-seller", label: "Top Seller" },
  { id: "value-of-the-day", label: "Value of the Day" },
];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "price_asc", label: "Price: Low to High" },
];

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface SpecRow {
  key: string;
  value: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ProductsClientProps {
  initialProducts: Product[];
  pagination: PaginationMeta;
  categories?: Category[];
  subcategories?: SubCategory[];
}

export default function ProductsClient({
  initialProducts = [],
  pagination,
  categories = [],
  subcategories = [],
}: ProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [products, setProducts] = useState<Product[]>(initialProducts);

  useEffect(() => {
    setProducts(Array.isArray(initialProducts) ? initialProducts : []);
  }, [initialProducts]);

  const currentCategory = searchParams.get("category") || "all";
  const currentStock = searchParams.get("inStock") || "all";
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
          (key === "category" && val.toLowerCase() === "all") ||
          (key === "inStock" && val.toLowerCase() === "all")
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
        router.push(`/dashboard/admin/products${qs ? `?${qs}` : ""}`, { scroll: false });
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
      router.push("/dashboard/admin/products", { scroll: false });
    });
  };

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    slug: "",
    price: "",
    originalPrice: "",
    discountPercentage: "",
    stockQuantity: "",
    sku: "",
    description: "",
    image: "",
    additionalImages: [] as string[],
    categoryId: "",
    subCategoryIds: new Set<string>(),
    badges: new Set<string>(),
    inStock: true,
    isFeatured: false,
    offerEndDate: "",
  });
  const [editSpecs, setEditSpecs] = useState<SpecRow[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered subcategories for the selected category in the edit modal
  const editAvailableSubCategories = useMemo(() => {
    if (!editForm.categoryId) return [];
    return subcategories.filter(
      (sub) =>
        sub.categoryId === editForm.categoryId ||
        String(sub.categoryId) === String(editForm.categoryId)
    );
  }, [editForm.categoryId, subcategories]);

  // Open Edit Modal & Populate Form
  const handleOpenEdit = (p: Product) => {
    const id = p.id || (p as any)._id;
    setEditingProductId(id);

    // Resolve categoryId
    let catId = "";
    if (p.categoryId) {
      if (typeof p.categoryId === "object" && (p.categoryId as any)._id) {
        catId = (p.categoryId as any)._id;
      } else {
        const found = categories.find(
          (c) => c.name === (p.categoryId as any)?.name || c.slug === (p.categoryId as any)?.slug
        );
        if (found) catId = (found._id || found.id || found.slug) as string;
      }
    }

    if (!catId && p.categories?.length) {
      const found = categories.find((c) => p.categories.includes(c.name));
      if (found) catId = (found._id || found.id || found.slug) as string;
    }

    // Resolve subcategories
    const subSet = new Set<string>();
    if (p.subCategoryIds && Array.isArray(p.subCategoryIds)) {
      p.subCategoryIds.forEach((s: any) => {
        if (typeof s === "string") subSet.add(s);
        else if (s._id) subSet.add(s._id);
      });
    }

    // Resolve badges
    const badgeSet = new Set<string>(p.badges || []);

    // Resolve specifications
    const specs: SpecRow[] = [];
    if (p.specifications && typeof p.specifications === "object") {
      Object.entries(p.specifications).forEach(([k, v]) => {
        specs.push({ key: k, value: String(v) });
      });
    }
    if (specs.length === 0) specs.push({ key: "Brand", value: "" });

    setEditForm({
      title: p.title || "",
      slug: p.slug || "",
      price: p.price ? String(p.price) : "",
      originalPrice: p.originalPrice ? String(p.originalPrice) : "",
      discountPercentage: p.discountPercentage ? String(p.discountPercentage) : "",
      stockQuantity: p.stockQuantity !== undefined ? String(p.stockQuantity) : "",
      sku: p.sku || "",
      description: p.description || "",
      image: p.image || "",
      additionalImages: p.additionalImages || [],
      categoryId: catId,
      subCategoryIds: subSet,
      badges: badgeSet,
      inStock: p.inStock,
      isFeatured: !!p.isFeatured,
      offerEndDate: p.offerEndDate ? new Date(p.offerEndDate).toISOString() : "",
    });
    setEditSpecs(specs);
    setIsEditOpen(true);
  };

  const hasEditPositiveStock = useMemo(() => {
    const qty = parseInt(editForm.stockQuantity, 10);
    return !isNaN(qty) && qty > 0;
  }, [editForm.stockQuantity]);

  // Auto calculate discount on price or original price change during update
  const handleEditPriceChange = (newPrice: string, newOriginalPrice: string) => {
    const price = parseFloat(newPrice);
    const originalPrice = parseFloat(newOriginalPrice);

    const discount =
      price && originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100).toString()
        : "";

    setEditForm((prev) => ({
      ...prev,
      price: newPrice,
      originalPrice: newOriginalPrice,
      discountPercentage: discount,
    }));
  };

  // Submit Product Edit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;

    setIsUpdating(true);

    const specObj: Record<string, string> = {};
    editSpecs.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        specObj[s.key.trim()] = s.value.trim();
      }
    });

    const payload: any = {
      title: editForm.title,
      slug: editForm.slug || generateSlug(editForm.title),
      price: parseFloat(editForm.price) || 0,
      originalPrice: editForm.originalPrice ? parseFloat(editForm.originalPrice) : undefined,
      discountPercentage: editForm.discountPercentage ? parseFloat(editForm.discountPercentage) : undefined,
      stockQuantity: editForm.stockQuantity ? parseInt(editForm.stockQuantity) : 0,
      sku: editForm.sku || undefined,
      description: editForm.description || undefined,
      image: editForm.image,
      additionalImages: editForm.additionalImages,
      categoryId: editForm.categoryId || undefined,
      subCategoryIds: Array.from(editForm.subCategoryIds),
      badges: Array.from(editForm.badges),
      inStock: hasEditPositiveStock ? true : editForm.inStock,
      isFeatured: editForm.isFeatured,
      offerEndDate: editForm.offerEndDate ? new Date(editForm.offerEndDate).toISOString() : undefined,
      specifications: specObj,
    };

    try {
      const res = await updateProduct(editingProductId, payload);
      if (res?.success !== false) {
        toast.success("Product updated successfully!");
        setProducts((prev) =>
          prev.map((p) => {
            if ((p.id || (p as any)._id) === editingProductId) {
              return {
                ...p,
                ...payload,
                categories: editForm.categoryId
                  ? [categories.find((c) => (c._id || c.id) === editForm.categoryId)?.name || ""]
                  : p.categories,
              };
            }
            return p;
          })
        );
        setIsEditOpen(false);
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update product");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error saving product");
    } finally {
      setIsUpdating(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (p: Product) => {
    setDeletingProduct(p);
    setIsDeleteOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    const id = deletingProduct.id || (deletingProduct as any)._id;
    setIsDeleting(true);

    try {
      const res = await deleteProduct(id);
      if (res?.success !== false) {
        toast.success("Product deleted successfully!");
        setProducts((prev) => prev.filter((p) => (p.id || (p as any)._id) !== id));
        setIsDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to delete product");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting product");
    } finally {
      setIsDeleting(false);
    }
  };

  const { page, limit, total, totalPages } = pagination || {
    page: 1,
    limit: 10,
    total: products.length,
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
            <span className="text-sky-600 dark:text-sky-400">Products</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Product{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Catalog
            </span>
          </h1>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage inventory, view detailed specifications, update pricing and edit items.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/dashboard/admin/products/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="space-y-4 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="w-48">
                <Select
                  aria-label="Filter by Category"
                  selectedKey={currentCategory}
                  onSelectionChange={(key) =>
                    updateParams({ category: key && String(key) !== "all" ? String(key) : undefined })
                  }
                >
                  <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                    <Select.Value className="text-xs font-semibold truncate" />
                    <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                  </Select.Trigger>
                  <Select.Popover className="w-52 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                    <ListBox>
                      <ListBox.Item
                        id="all"
                        textValue="All Categories"
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
                      >
                        All Categories
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                      {categories.map((c) => {
                        const val = c.slug || c.name;
                        return (
                          <ListBox.Item
                            key={c._id || c.id || c.name}
                            id={val}
                            textValue={c.name}
                            className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
                          >
                            {c.name}
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        );
                      })}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>
            )}

            {/* Stock Filter */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200/60 dark:border-gray-700">
              {(
                [
                  { id: "all", label: "All Stock" },
                  { id: "true", label: "In Stock" },
                  { id: "false", label: "Out of Stock" },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  onClick={() => updateParams({ inStock: st.id === "all" ? undefined : st.id })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    currentStock === st.id
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            Total products: <span className="font-extrabold text-gray-900 dark:text-white">{total}</span>
          </div>
        </div>

        {/* Search, Sort & Reset Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-gray-800">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, SKU, or category..."
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
            {/* Sort Select */}
            <div className="w-48">
              <Select
                aria-label="Sort Products"
                selectedKey={currentSort}
                onSelectionChange={(key) => updateParams({ sort: key ? String(key) : "newest" })}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
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

            {(currentSearch || currentCategory !== "all" || currentStock !== "all" || currentSort !== "newest") && (
              <Button
                size="sm"
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

      {/* ── Products Table ── */}
      {isPending ? (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-gray-500">Loading products...</p>
        </Card>
      ) : products.length === 0 ? (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              No products found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentSearch
                ? "No products matched your search keyword or filters."
                : "Your store does not have any products yet."}
            </p>
          </div>
          <Link
            href="/dashboard/admin/products/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Product</span>
          </Link>
        </Card>
      ) : (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-800/40 text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Badges</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800/60 text-xs">
                {products.map((product) => {
                  const id = product.id || (product as any)._id;
                  const catName =
                    product.categoryId?.name ||
                    (product.categories && product.categories[0]) ||
                    "Uncategorized";

                  return (
                    <tr
                      key={id}
                      className="hover:bg-slate-50/70 dark:hover:bg-gray-800/30 transition-colors group"
                    >
                      {/* Product Media & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-center shrink-0 overflow-hidden">
                            {product.image ? (
                              <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                sizes="48px"
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <Package className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <Link
                              href={`/dashboard/admin/products/${product.slug}`}
                              className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm hover:text-sky-600 dark:hover:text-sky-400 transition-colors line-clamp-1"
                            >
                              {product.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              {product.sku && (
                                <span className="font-mono text-[10px] text-gray-400 uppercase">
                                  SKU: {product.sku}
                                </span>
                              )}
                              {product.isFeatured && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40">
                                  <Sparkles className="w-2.5 h-2.5" /> Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold">
                          <Layers className="w-3 h-3 text-sky-500" />
                          {catName}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900 dark:text-white text-sm">
                            ${product.price?.toFixed(2)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-[11px] text-gray-400 line-through">
                              ${product.originalPrice?.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-mono text-xs font-bold ${
                            (product.stockQuantity ?? 0) > 10
                              ? "text-gray-700 dark:text-gray-300"
                              : (product.stockQuantity ?? 0) > 0
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-rose-500"
                          }`}
                        >
                          {product.stockQuantity !== undefined ? product.stockQuantity : "N/A"}
                        </span>
                        <span className="block text-[10px] text-gray-400">units</span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {product.inStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" />
                            In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/40">
                            <XCircle className="w-3 h-3" />
                            Out of Stock
                          </span>
                        )}
                      </td>

                      {/* Badges */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {product.badges && product.badges.length > 0 ? (
                            product.badges.map((b) => (
                              <span
                                key={b}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-slate-200 dark:border-gray-700 capitalize"
                              >
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-[11px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/admin/products/${product.slug}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/50 transition-colors"
                            title="View Product Page"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer bg-transparent"
                            title="Quick Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(product)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer bg-transparent"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/40 dark:bg-gray-900/40">
              <Pagination className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-gray-500 dark:text-gray-400">
                <Pagination.Summary className="text-xs">
                  Showing <span className="text-gray-800 dark:text-gray-200 font-bold">{startItem}–{endItem}</span> of{" "}
                  <span className="text-sky-600 dark:text-sky-400 font-bold">{total}</span> products
                </Pagination.Summary>

                <Pagination.Content className="flex items-center gap-1">
                  <Pagination.Item>
                    <Pagination.Previous
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-sky-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      isDisabled={page === 1 || isPending}
                      onPress={() => updateParams({ page: String(page - 1) })}
                    >
                      <Pagination.PreviousIcon />
                      <span>Prev</span>
                    </Pagination.Previous>
                  </Pagination.Item>

                  {getPageNumbers().map((p, i) =>
                    p === "ellipsis" ? (
                      <Pagination.Item key={`ellipsis-${i}`}>
                        <Pagination.Ellipsis className="px-2 text-gray-400 select-none text-xs" />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === page}
                          isDisabled={isPending}
                          onPress={() => updateParams({ page: String(p) })}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            p === page
                              ? "bg-sky-500 text-white shadow-sm shadow-sky-500/30"
                              : "hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}

                  <Pagination.Item>
                    <Pagination.Next
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-sky-50 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      isDisabled={page === totalPages || isPending}
                      onPress={() => updateParams({ page: String(page + 1) })}
                    >
                      <span>Next</span>
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          )}
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          EDIT PRODUCT MODAL (HeroUI v3 Modal)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isEditOpen} onOpenChange={setIsEditOpen}>
        <Modal.Backdrop>
          <Modal.Container size="xl">
            <Modal.Dialog className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <Modal.Header className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-4">
                <div>
                  <Modal.Heading className="text-lg font-extrabold text-gray-900 dark:text-white">
                    Quick Edit Product
                  </Modal.Heading>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Update inventory count, pricing, media and attributes.
                  </p>
                </div>
                <Modal.CloseTrigger className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer p-1 rounded-lg">
                  ✕
                </Modal.CloseTrigger>
              </Modal.Header>

              <form onSubmit={handleSaveProduct} className="space-y-6">
                {/* 1. Core Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Basic Info
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Title *
                      </label>
                      <Input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditForm((prev) => ({
                            ...prev,
                            title: val,
                            slug: generateSlug(val),
                          }));
                        }}
                        placeholder="Product title"
                        required
                        className="w-full h-10 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        URL Slug *
                      </label>
                      <Input
                        type="text"
                        value={editForm.slug}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, slug: e.target.value }))
                        }
                        placeholder="product-slug"
                        required
                        className="w-full h-10 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      SKU (Stock Keeping Unit)
                    </label>
                    <Input
                      type="text"
                      value={editForm.sku}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, sku: e.target.value }))
                      }
                      placeholder="e.g. ELEC-PROD-001"
                      className="w-full h-10 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Description
                    </label>
                    <TextArea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Brief overview of features and capabilities..."
                      rows={3}
                      className="w-full rounded-xl bg-slate-50 dark:bg-gray-800 text-xs"
                    />
                  </div>
                </div>

                {/* 2. Pricing & Inventory */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Pricing & Inventory
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Price ($) *
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.price}
                        onChange={(e) =>
                          handleEditPriceChange(e.target.value, editForm.originalPrice)
                        }
                        required
                        className="w-full h-10 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Original Price ($)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.originalPrice}
                        onChange={(e) =>
                          handleEditPriceChange(editForm.price, e.target.value)
                        }
                        className="w-full h-10 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Discount (%)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.discountPercentage}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, discountPercentage: e.target.value }))
                        }
                        className="w-full h-10 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Stock Quantity *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        value={editForm.stockQuantity}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            stockQuantity: e.target.value,
                            inStock: parseInt(e.target.value) > 0,
                          }))
                        }
                        required
                        className="w-full h-10 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* In Stock toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200/60 dark:border-gray-800 cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                          In Stock
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {hasEditPositiveStock
                            ? "Automatically enabled (Stock > 0)"
                            : "Mark if product is ready for purchase"}
                        </p>
                      </div>
                      <Switch
                        isSelected={hasEditPositiveStock ? true : editForm.inStock}
                        isDisabled={hasEditPositiveStock}
                        onChange={(val) => {
                          if (!hasEditPositiveStock) {
                            setEditForm((prev) => ({ ...prev, inStock: !!val }));
                          }
                        }}
                        className={hasEditPositiveStock ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
                      >
                        <Switch.Content className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"}>
                          <Switch.Control className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"}>
                            <Switch.Thumb className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"} />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    </div>

                    {/* Featured toggle */}
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200/60 dark:border-gray-800 cursor-pointer">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Featured Item
                        </p>
                        <p className="text-[10px] text-gray-400">
                          Promote in featured grids & hero sections
                        </p>
                      </div>
                      <Switch
                        isSelected={editForm.isFeatured}
                        onChange={(val) =>
                          setEditForm((prev) => ({ ...prev, isFeatured: !!val }))
                        }
                        className="cursor-pointer"
                      >
                        <Switch.Content className="cursor-pointer">
                          <Switch.Control className="cursor-pointer">
                            <Switch.Thumb className="cursor-pointer" />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    </div>
                  </div>

                  {/* Deal Countdown End Date Picker */}
                  <HeroUIDateTimePicker
                    label="Special Deal Countdown End Date & Time"
                    value={editForm.offerEndDate}
                    onChange={(isoString) =>
                      setEditForm((prev) => ({
                        ...prev,
                        offerEndDate: isoString,
                      }))
                    }
                    helperText="When the countdown timer finishes, the product deal price automatically resets to original price across the entire store."
                  />
                </div>

                {/* 3. Media Upload */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Product Media
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <ImageUploader
                        label="Thumbnail (Primary)"
                        value={editForm.image}
                        onChange={(url) => setEditForm((prev) => ({ ...prev, image: url }))}
                      />
                    </div>

                    <div>
                      <ImageUploader
                        label="Gallery Image"
                        value={editForm.additionalImages[0] || ""}
                        onChange={(url) =>
                          setEditForm((prev) => ({
                            ...prev,
                            additionalImages: url ? [url] : [],
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Taxonomy & Badges */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Category & Badges
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                        Category
                      </label>
                      <Select
                        aria-label="Product Category"
                        selectedKey={editForm.categoryId}
                        onSelectionChange={(key) =>
                          setEditForm((prev) => ({
                            ...prev,
                            categoryId: key ? String(key) : "",
                            subCategoryIds: new Set<string>(),
                          }))
                        }
                        placeholder="Select Category"
                      >
                        <Select.Trigger className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                          <Select.Value className="text-xs font-semibold truncate" />
                          <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                        </Select.Trigger>
                        <Select.Popover className="w-64 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                          <ListBox>
                            {categories.map((c) => {
                              const cid = (c._id || c.id || c.slug) as string;
                              return (
                                <ListBox.Item
                                  key={cid}
                                  id={cid}
                                  textValue={c.name}
                                  className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
                                >
                                  {c.name}
                                  <ListBox.ItemIndicator />
                                </ListBox.Item>
                              );
                            })}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>

                    {editAvailableSubCategories.length > 0 && (
                      <div>
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                          Subcategory
                        </label>
                        <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700">
                          {editAvailableSubCategories.map((sub) => {
                            const subId = (sub._id || sub.id || sub.slug) as string;
                            const isSelected = editForm.subCategoryIds.has(subId);
                            return (
                              <button
                                type="button"
                                key={subId}
                                onClick={() => {
                                  const next = new Set(editForm.subCategoryIds);
                                  if (isSelected) next.delete(subId);
                                  else next.add(subId);
                                  setEditForm((prev) => ({ ...prev, subCategoryIds: next }));
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-sky-500 text-white shadow-2xs"
                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-slate-100"
                                }`}
                              >
                                {sub.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                      Promotional Badges
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_BADGES.map((b) => {
                        const isSelected = editForm.badges.has(b.id);
                        return (
                          <button
                            type="button"
                            key={b.id}
                            onClick={() => {
                              const next = new Set(editForm.badges);
                              if (isSelected) next.delete(b.id);
                              else next.add(b.id);
                              setEditForm((prev) => ({ ...prev, badges: next }));
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs"
                                : "bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-slate-200"
                            }`}
                          >
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 5. Specifications */}
                <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      Technical Specs
                    </h3>
                    <Button
                      size="sm"
                      type="button"
                      onPress={() => setEditSpecs((prev) => [...prev, { key: "", value: "" }])}
                      className="px-3 py-1 bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </Button>
                  </div>

                  <div className="space-y-2.5">
                    {editSpecs.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={row.key}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditSpecs((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, key: val } : r))
                            );
                          }}
                          placeholder="Key (e.g. RAM, Storage, Color)"
                          className="flex-1 h-9 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs"
                        />
                        <Input
                          type="text"
                          value={row.value}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditSpecs((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, value: val } : r))
                            );
                          }}
                          placeholder="Value (e.g. 16GB DDR5)"
                          className="flex-1 h-9 rounded-xl bg-slate-50 dark:bg-gray-800 text-xs"
                        />
                        {editSpecs.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditSpecs((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-2 text-gray-400 hover:text-rose-500 rounded-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer */}
                <Modal.Footer className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-gray-800">
                  <Button
                    type="button"
                    onPress={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isDisabled={isUpdating}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs shadow-md cursor-pointer"
                  >
                    {isUpdating ? "Saving..." : "Save Product"}
                  </Button>
                </Modal.Footer>
              </form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Delete Product?
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-gray-900 dark:text-white">
                    &ldquo;{deletingProduct?.title}&rdquo;
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onPress={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  isDisabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer"
                >
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
