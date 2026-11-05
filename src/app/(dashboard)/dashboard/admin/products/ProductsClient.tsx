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
  Shield,
  Info,
} from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";
import { Product, Category, SubCategory } from "@/types";
import { updateProduct, deleteProduct } from "@/lib/action/products";
import { WARRANTY_TYPE_OPTIONS } from "@/lib/warranty";
import { hasOfferDiscount } from "@/lib/offer";
import { hasBrandSpec } from "@/lib/productSpecs";
import { recalcPricing } from "@/lib/pricing";
import { isStockTracked } from "@/lib/stock";
import { useSiteSettings } from "@/context/SiteSettingsContext";

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
  const { formatPrice, currencySymbol } = useSiteSettings();
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
    investPrice: "",
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
    warrantyPeriodMonths: "",
    warrantyType: "manufacturer-warranty",
    warrantyTerms: "",
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
      investPrice: p.investPrice != null ? String(p.investPrice) : "",
      discountPercentage: p.discountPercentage ? String(p.discountPercentage) : "",
      // A product with no stock number is not tracked; the field then starts empty.
      stockQuantity: p.stockQuantity != null ? String(p.stockQuantity) : "",
      sku: p.sku || "",
      description: p.description || "",
      image: p.image || "",
      additionalImages: p.additionalImages || [],
      categoryId: catId,
      subCategoryIds: subSet,
      badges: badgeSet,
      inStock: p.inStock,
      isFeatured: !!p.isFeatured,
      warrantyPeriodMonths:
        p.warrantyPeriodMonths != null ? String(p.warrantyPeriodMonths) : "",
      warrantyType: p.warrantyType || "manufacturer-warranty",
      warrantyTerms: p.warrantyTerms || "",
      offerEndDate: p.offerEndDate ? new Date(p.offerEndDate).toISOString() : "",
    });
    setEditSpecs(specs);
    setIsEditOpen(true);
  };

  const hasEditPositiveStock = useMemo(() => {
    const qty = parseInt(editForm.stockQuantity, 10);
    return !isNaN(qty) && qty > 0;
  }, [editForm.stockQuantity]);

  // A blank field means the product is not stock-tracked, so it can never sell out
  // and the In Stock switch has nothing to control.
  const editStockTracked = useMemo(
    () => editForm.stockQuantity.trim() !== "" && !isNaN(parseInt(editForm.stockQuantity, 10)),
    [editForm.stockQuantity]
  );

  // A countdown is only offered when the original price is actually higher than
  // the selling price. Equal prices would run a timer for a deal nobody gets.
  const hasEditDiscount = hasOfferDiscount(editForm.price, editForm.originalPrice);

  // Price or original price is the source: the discount percentage follows.
  const handleEditPriceChange = (newPrice: string, newOriginalPrice: string) => {
    setEditForm((prev) => ({
      ...prev,
      ...recalcPricing(
        { price: newPrice, originalPrice: newOriginalPrice, discountPercentage: prev.discountPercentage },
        "price"
      ),
    }));
  };

  // Discount percentage is the source: the selling price follows from the
  // original price (or the original price follows from the selling price).
  const handleEditDiscountChange = (newDiscount: string) => {
    setEditForm((prev) => ({
      ...prev,
      ...recalcPricing(
        { price: prev.price, originalPrice: prev.originalPrice, discountPercentage: newDiscount },
        "discountPercentage"
      ),
    }));
  };

  // Submit Product Edit
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProductId) return;

    // The warranty has to agree with itself before it reaches the API. A covering
    // type with no period, or an "Other" type with no terms, would be stored as
    // no warranty at all — the opposite of what the admin just chose.
    const editWarrantyMonths = parseInt(editForm.warrantyPeriodMonths || "0", 10) || 0;
    if (editForm.warrantyType !== "none" && editWarrantyMonths <= 0) {
      toast.error("Set a warranty period of at least 1 month, or choose No Warranty.");
      return;
    }
    if (editForm.warrantyType === "other" && !editForm.warrantyTerms.trim()) {
      toast.error("Describe the coverage in Warranty Terms for an Other warranty.");
      return;
    }

    const specObj: Record<string, string> = {};
    editSpecs.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        specObj[s.key.trim()] = s.value.trim();
      }
    });

    // A manufacturer warranty is claimed from the brand, so the specs have to
    // carry one before the product is saved.
    if (editForm.warrantyType === "manufacturer-warranty" && !hasBrandSpec(specObj)) {
      toast.error("Add the brand in Specifications — a manufacturer warranty is claimed from the brand.");
      return;
    }

    setIsUpdating(true);

    const payload: any = {
      title: editForm.title,
      slug: editForm.slug || generateSlug(editForm.title),
      price: parseFloat(editForm.price) || 0,
      originalPrice: editForm.originalPrice ? parseFloat(editForm.originalPrice) : undefined,
      investPrice: editForm.investPrice ? parseFloat(editForm.investPrice) : undefined,
      discountPercentage: editForm.discountPercentage ? parseFloat(editForm.discountPercentage) : undefined,
      // Blank means "not stock-tracked": null clears the old number, so the
      // product stops being counted on the shop, the cart and the order flow.
      stockQuantity: editStockTracked ? parseInt(editForm.stockQuantity, 10) : null,
      sku: editForm.sku || undefined,
      description: editForm.description || undefined,
      image: editForm.image,
      additionalImages: editForm.additionalImages,
      categoryId: editForm.categoryId || undefined,
      subCategoryIds: Array.from(editForm.subCategoryIds),
      badges: Array.from(editForm.badges),
      inStock: hasEditPositiveStock ? true : editForm.inStock,
      isFeatured: editForm.isFeatured,
      warrantyPeriodMonths: editForm.warrantyPeriodMonths
        ? parseInt(editForm.warrantyPeriodMonths, 10)
        : undefined,
      warrantyType: editForm.warrantyType,
      warrantyTerms: editForm.warrantyTerms || undefined,
      offerEndDate:
        hasEditDiscount && editForm.offerEndDate
          ? new Date(editForm.offerEndDate).toISOString()
          : undefined,
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
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Products</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Product{" "}
            <span className="text-primary">
              Catalog
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Manage inventory, view detailed specifications, update pricing and edit items.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Link
            href="/dashboard/admin/products/add"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* ── Filters & Search Toolbar ── */}
      <div className="space-y-4 bg-[var(--surface-elevated)] p-4 rounded-2xl border border-[var(--border-color)] shadow-xs">
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
                  <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-semibold text-[var(--foreground-secondary)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                    <Select.Value className="text-xs font-semibold truncate" />
                    <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
                  </Select.Trigger>
                  <Select.Popover className="w-52 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                    <ListBox>
                      <ListBox.Item
                        id="all"
                        textValue="All Categories"
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground)] cursor-pointer flex items-center justify-between"
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
                            className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground)] cursor-pointer flex items-center justify-between"
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
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] border border-[var(--border-color)]/60 dark:border-[var(--border-color)]">
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
                      ? "bg-primary text-white shadow-xs"
                      : "text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:hover:text-[var(--foreground)]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="text-xs font-semibold text-[var(--foreground-muted)]">
            Total products: <span className="font-extrabold text-[var(--foreground)]">{total}</span>
          </div>
        </div>

        {/* Search, Sort & Reset Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[var(--border-color)]">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, SKU, or category..."
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
            {/* Sort Select */}
            <div className="w-48">
              <Select
                aria-label="Sort Products"
                selectedKey={currentSort}
                onSelectionChange={(key) => updateParams({ sort: key ? String(key) : "newest" })}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-semibold text-[var(--foreground-secondary)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
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

            {(currentSearch || currentCategory !== "all" || currentStock !== "all" || currentSort !== "newest") && (
              <Button
                size="sm"
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

      {/* ── Products Table ── */}
      {isPending ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Loading products...</p>
        </Card>
      ) : products.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Package className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              No products found
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {currentSearch
                ? "No products matched your search keyword or filters."
                : "Your store does not have any products yet."}
            </p>
          </div>
          <Link
            href="/dashboard/admin/products/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Product</span>
          </Link>
        </Card>
      ) : (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)]/80 dark:bg-[var(--surface-alt)]/40 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4 text-center">Sold</th>
                  <th className="py-3.5 px-4 text-center">Stock</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Badges</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {products.map((product) => {
                  const id = product.id || (product as any)._id;
                  const catName =
                    product.categoryId?.name ||
                    (product.categories && product.categories[0]) ||
                    "Uncategorized";

                  return (
                    <tr
                      key={id}
                      className="hover:bg-[var(--surface-alt)]/70 dark:hover:bg-[var(--surface)]/30 transition-colors group"
                    >
                      {/* Product Media & Title */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] flex items-center justify-center shrink-0 overflow-hidden">
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
                              <Package className="w-5 h-5 text-[var(--foreground-muted)]" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-xs">
                            <Link
                              href={`/dashboard/admin/products/${product.slug}`}
                              className="font-bold text-[var(--foreground)] text-xs sm:text-sm hover:text-primary dark:hover:text-primary transition-colors line-clamp-1"
                            >
                              {product.title}
                            </Link>
                            <div className="flex items-center gap-2 mt-0.5">
                              {product.sku && (
                                <span className="font-mono text-[10px] text-[var(--foreground-muted)] uppercase">
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
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--surface-alt)] text-[var(--foreground)] text-xs font-semibold">
                          <Layers className="w-3 h-3 text-primary" />
                          {catName}
                        </span>
                      </td>

                      {/* Price & Profit */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-black text-[var(--foreground)] text-sm">
                            {formatPrice(product.price)}
                          </span>
                          {product.originalPrice && product.originalPrice > product.price && (
                            <span className="text-[11px] text-[var(--foreground-muted)] line-through">
                              {formatPrice(product.originalPrice)}
                            </span>
                          )}
                          {product.investPrice != null ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`text-[10px] font-bold ${
                                  product.price >= product.investPrice
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-500"
                                }`}
                                title={`Cost: ${formatPrice(product.investPrice)} | Profit: ${
                                  product.price >= product.investPrice ? "+" : ""
                                }${formatPrice(product.price - product.investPrice)}`}
                              >
                                {product.price >= product.investPrice ? "+" : ""}{formatPrice(product.price - product.investPrice)} P/L
                              </span>
                              {product.profitMargin != null && (
                                <span className="text-[9px] text-[var(--foreground-muted)] font-medium">
                                  ({product.profitMargin}%)
                                </span>
                              )}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      {/* Units Sold */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono text-xs font-bold text-[var(--foreground)]">
                          {product.sellCount ?? 0}
                        </span>
                        <span className="block text-[10px] text-[var(--foreground-muted)] font-medium">sold</span>
                      </td>

                      {/* Stock Quantity */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isStockTracked(product.stockQuantity) ? (
                          <>
                            <span
                              className={`font-mono text-xs font-bold ${
                                (product.stockQuantity ?? 0) > 10
                                  ? "text-[var(--foreground)]"
                                  : (product.stockQuantity ?? 0) > 0
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-rose-500"
                              }`}
                            >
                              {product.stockQuantity}
                            </span>
                            <span className="block text-[10px] text-[var(--foreground-muted)]">units</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-semibold text-[var(--foreground-muted)]">
                              Not tracked
                            </span>
                            <span className="block text-[10px] text-[var(--foreground-muted)]">always available</span>
                          </>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {!isStockTracked(product.stockQuantity) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[var(--surface-alt)] text-[var(--foreground-muted)] border border-[var(--border-color)]">
                            <Package className="w-3 h-3" />
                            Not Tracked
                          </span>
                        ) : product.inStock ? (
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
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--surface-alt)] text-[var(--foreground-muted)] border border-[var(--border-color)] capitalize"
                              >
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-[var(--foreground-muted)] text-[11px]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/admin/products/${product.slug}`}
                            className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-primary hover:bg-primary/10 transition-colors"
                            title="View Product Page"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-colors cursor-pointer bg-transparent"
                            title="Quick Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(product)}
                            className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer bg-transparent"
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
            <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/40 dark:bg-[var(--surface-elevated)]/40">
              <Pagination className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-[var(--foreground-muted)]">
                <Pagination.Summary className="text-xs">
                  Showing <span className="text-[var(--foreground)] font-bold">{startItem}–{endItem}</span> of{" "}
                  <span className="text-primary font-bold">{total}</span> products
                </Pagination.Summary>

                <Pagination.Content className="flex items-center gap-1">
                  <Pagination.Item>
                    <Pagination.Previous
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-primary/10 dark:hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                        <Pagination.Ellipsis className="px-2 text-[var(--foreground-muted)] select-none text-xs" />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={p}>
                        <Pagination.Link
                          isActive={p === page}
                          isDisabled={isPending}
                          onPress={() => updateParams({ page: String(p) })}
                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            p === page
                              ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-sm shadow-primary/30"
                              : "hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)]"
                          }`}
                        >
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    )
                  )}

                  <Pagination.Item>
                    <Pagination.Next
                      className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs hover:bg-primary/10 dark:hover:bg-[var(--surface)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
              <Modal.Header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <div>
                  <Modal.Heading className="text-lg font-extrabold text-[var(--foreground)]">
                    Quick Edit Product
                  </Modal.Heading>
                  <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
                    Update inventory count, pricing, media and attributes.
                  </p>
                </div>
                <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg">
                  ✕
                </Modal.CloseTrigger>
              </Modal.Header>

              <form onSubmit={handleSaveProduct} className="space-y-6">
                {/* 1. Core Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Basic Info
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
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
                        className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
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
                        className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                      SKU (Stock Keeping Unit)
                    </label>
                    <Input
                      type="text"
                      value={editForm.sku}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, sku: e.target.value }))
                      }
                      placeholder="e.g. ELEC-PROD-001"
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                      Description
                    </label>
                    <TextArea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Brief overview of features and capabilities..."
                      rows={3}
                      className="w-full rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                    />
                  </div>
                </div>

                {/* 2. Pricing & Inventory */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Pricing & Inventory
                  </h3>

                  {/* Three fields per row: five fields in one row forced the
                      labels to wrap and pushed every input out of line. */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                        Price ({currencySymbol}) *
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
                        className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-bold"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                        Original Price ({currencySymbol})
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editForm.originalPrice}
                        onChange={(e) =>
                          handleEditPriceChange(editForm.price, e.target.value)
                        }
                        className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                        Invest / Cost ({currencySymbol})
                        <span className="ml-1 text-[10px] font-normal text-[var(--foreground-muted)]">(admin)</span>
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="8.99"
                        value={editForm.investPrice}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, investPrice: e.target.value }))
                        }
                        className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                        Discount (%)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={editForm.discountPercentage}
                        onChange={(e) => handleEditDiscountChange(e.target.value)}
                        className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                        Stock Quantity
                      </label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 32"
                        value={editForm.stockQuantity}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            stockQuantity: e.target.value,
                            // A positive count forces the product on; a blank field
                            // hands control back to the switch, which is hidden then.
                            inStock: parseInt(e.target.value, 10) > 0 ? true : prev.inStock,
                          }))
                        }
                        className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-bold"
                      />
                    </div>
                  </div>

                  {/* One shared note instead of a paragraph under the field: the
                      paragraph used to stretch the last column and unbalance the row. */}
                  <p className="flex items-start gap-1.5 text-[10px] text-[var(--foreground-muted)]">
                    <Info className="w-3 h-3 shrink-0 mt-0.5" />
                    Leave Stock Quantity blank if this product has no stock count. It
                    then sells without any stock limit.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* In Stock toggle — only for a product with a stock count */}
                    <div className="flex items-center justify-between gap-3 p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]/60">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--foreground)]">
                          In Stock
                        </p>
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          {!editStockTracked
                            ? "Not tracked — the product is always available"
                            : hasEditPositiveStock
                              ? "Automatically enabled (Stock > 0)"
                              : "Mark if product is ready for purchase"}
                        </p>
                      </div>
                      {editStockTracked && (
                        <Switch
                          isSelected={hasEditPositiveStock ? true : editForm.inStock}
                          isDisabled={hasEditPositiveStock}
                          onChange={(val) => {
                            if (!hasEditPositiveStock) {
                              setEditForm((prev) => ({ ...prev, inStock: !!val }));
                            }
                          }}
                          className={`shrink-0 ${hasEditPositiveStock ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <Switch.Content className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"}>
                            <Switch.Control className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"}>
                              <Switch.Thumb className={hasEditPositiveStock ? "cursor-not-allowed" : "cursor-pointer"} />
                            </Switch.Control>
                          </Switch.Content>
                        </Switch>
                      )}
                    </div>

                    {/* Featured toggle */}
                    <div className="flex items-center justify-between gap-3 p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]/60 cursor-pointer">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-[var(--foreground)] flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" /> Featured Item
                        </p>
                        <p className="text-[10px] text-[var(--foreground-muted)]">
                          Promote in featured grids & hero sections
                        </p>
                      </div>
                      <Switch
                        isSelected={editForm.isFeatured}
                        onChange={(val) =>
                          setEditForm((prev) => ({ ...prev, isFeatured: !!val }))
                        }
                        className="shrink-0 cursor-pointer"
                      >
                        <Switch.Content className="cursor-pointer">
                          <Switch.Control className="cursor-pointer">
                            <Switch.Thumb className="cursor-pointer" />
                          </Switch.Control>
                        </Switch.Content>
                      </Switch>
                    </div>
                  </div>

                  {/* Warranty Period */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-primary" /> Warranty Period (months)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="120"
                      step="1"
                      placeholder="e.g. 12"
                      disabled={editForm.warrantyType === "none"}
                      value={editForm.warrantyPeriodMonths}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          warrantyPeriodMonths: e.target.value,
                        }))
                      }
                      className="w-full h-10 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                    />
                    <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                      When a customer buys this product and the order is delivered, a
                      warranty record is automatically created for this number of months.
                      A period of 0 issues nothing, and <span className="font-semibold">No
                      Warranty</span> means a claim can never be filed. Editing this only
                      affects future deliveries.
                    </p>
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-primary" /> Warranty Type
                    </label>
                    <Select
                      selectedKey={editForm.warrantyType}
                      onSelectionChange={(key) => {
                        const warrantyType = String(key);
                        // "No warranty" clears the period so the two fields can
                        // never contradict each other.
                        setEditForm((prev) => ({
                          ...prev,
                          warrantyType,
                          ...(warrantyType === "none" ? { warrantyPeriodMonths: "" } : {}),
                        }));
                      }}
                      placeholder="Select warranty type"
                    >
                      <Select.Trigger className="w-full cursor-pointer">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover className="w-56 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl">
                        <ListBox>
                          {/* One option per type the server accepts, taken from the
                              shared catalog so the form and the dashboards agree. */}
                          {WARRANTY_TYPE_OPTIONS.map((option) => (
                            <ListBox.Item
                              key={option.value}
                              id={option.value}
                              textValue={option.label}
                            >
                              {option.label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {/* Says who carries the repair, so the choice is not a guess. */}
                    <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                      {
                        WARRANTY_TYPE_OPTIONS.find((o) => o.value === editForm.warrantyType)
                          ?.customerAction
                      }
                    </p>
                    {editForm.warrantyType === "manufacturer-warranty" && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                        Fill in the Brand row in Specifications — the brand carries this warranty.
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-primary" /> Warranty Terms
                    </label>
                    <TextArea
                      placeholder="e.g. Covers manufacturing defects for 12 months from delivery date..."
                      value={editForm.warrantyTerms}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, warrantyTerms: e.target.value }))
                      }
                      rows={3}
                      className="w-full rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs border border-[var(--border-color)] px-3 py-2 resize-none outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                    />
                    <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                      Shown to customers on the product page and on the warranty record.
                      Required when the type is <span className="font-semibold">Other warranty</span>.
                    </p>
                  </div>

                  {/* Deal Countdown End Date Picker — only for a real discount */}
                  {hasEditDiscount ? (
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
                  ) : (
                    <p className="text-[11px] text-[var(--foreground-muted)] bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                      Set an original price higher than the selling price to run a deal
                      countdown. With both prices the same there is no offer to count down.
                    </p>
                  )}
                </div>

                {/* 3. Media Upload */}
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
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
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                    Category & Badges
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
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
                        <Select.Trigger className="w-full h-10 px-3 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-semibold text-[var(--foreground-secondary)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                          <Select.Value className="text-xs font-semibold truncate" />
                          <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-[var(--foreground-muted)] shrink-0" />
                        </Select.Trigger>
                        <Select.Popover className="w-64 p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                          <ListBox>
                            {categories.map((c) => {
                              const cid = (c._id || c.id || c.slug) as string;
                              return (
                                <ListBox.Item
                                  key={cid}
                                  id={cid}
                                  textValue={c.name}
                                  className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/10 dark:hover:bg-[var(--surface)] text-[var(--foreground)] cursor-pointer flex items-center justify-between"
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
                        <label className="text-xs font-bold text-[var(--foreground)] block mb-1">
                          Subcategory
                        </label>
                        <div className="flex flex-wrap gap-2 p-2 bg-[var(--surface-alt)] dark:bg-[var(--surface)] rounded-xl border border-[var(--border-color)]">
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
                                    ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-2xs"
                                    : "bg-[var(--surface-elevated)] dark:bg-[var(--foreground-muted)] text-[var(--foreground)] hover:bg-[var(--surface-alt)]"
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
                    <label className="text-xs font-bold text-[var(--foreground)] block mb-1.5">
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
                                ? "bg-primary text-white shadow-xs"
                                : "bg-[var(--surface-alt)] text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]"
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
                <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                      Technical Specs
                    </h3>
                    <Button
                      size="sm"
                      type="button"
                      onPress={() => setEditSpecs((prev) => [...prev, { key: "", value: "" }])}
                      className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
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
                          className="flex-1 h-9 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
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
                          className="flex-1 h-9 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs"
                        />
                        {editSpecs.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setEditSpecs((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-2 text-[var(--foreground-muted)] hover:text-rose-500 rounded-lg cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Modal Footer */}
                <Modal.Footer className="flex items-center justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
                  <Button
                    type="button"
                    onPress={() => setIsEditOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isDisabled={isUpdating}
                    className="px-6 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] font-bold text-xs shadow-xs cursor-pointer hover:opacity-95 transition-all"
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
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-base font-extrabold text-[var(--foreground)]">
                  Delete Product?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Are you sure you want to delete{" "}
                  <span className="font-bold text-[var(--foreground)]">
                    &ldquo;{deletingProduct?.title}&rdquo;
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onPress={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] font-bold text-xs cursor-pointer"
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
