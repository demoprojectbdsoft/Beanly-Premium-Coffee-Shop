"use client";

import React, { useState, useMemo, useRef } from "react";
import {
  Card,
  Input,
  TextArea,
  Button,
  Select,
  ListBox,
  Switch,
} from "@heroui/react";
import {
  PackagePlus,
  ImageIcon,
  X,
  Plus,
  Trash2,
  Check,
  DollarSign,
  Layers,
  Sparkles,
  Upload,
  Link2,
  Loader2,
} from "lucide-react";
import { Category, SubCategory } from "@/types";
import ImageUploader from "@/components/shared/ImageUploader";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";
import { addProduct } from "@/lib/action/products";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

interface AddProductClientProps {
  categories?: Category[];
  subcategories?: SubCategory[];
}

const AVAILABLE_BADGES = [
  { id: "new", label: "New" },
  { id: "hot", label: "Hot" },
  { id: "popular", label: "Popular" },
  { id: "trending", label: "Trending" },
  { id: "top-seller", label: "Top Seller" },
  { id: "value-of-the-day", label: "Value of the Day" },
];

// ─── Converts a name into a URL-friendly slug ─────────────────────────────────
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // remove special characters
    .replace(/[\s_-]+/g, "-") // replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, ""); // remove leading/trailing hyphens
}

// ─── Upload a file to ImgBB and return the hosted URL ────────────────────────
async function uploadToImgBB(file: File): Promise<string> {
  const body = new FormData();
  body.append("image", file);

  const response = await fetch(
    `https://api.imgbb.com/1/upload?key=${process.env.NEXT_PUBLIC_IMGBB_API_KEY ?? ""}`,
    { method: "POST", body }
  );

  if (!response.ok) throw new Error(`Upload failed: ${response.status}`);

  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message ?? "Upload failed");

  return data.data.url as string;
}

interface SpecRow {
  key: string;
  value: string;
}

export default function AddProductClient({
  categories = [],
  subcategories = [],
}: AddProductClientProps) {
  const router = useRouter();

  // ── Basic product fields ────────────────────────────────────────────────────
  const [formState, setFormState] = useState({
    title: "",
    slug: "",
    price: "",
    originalPrice: "",
    investPrice: "",
    discountPercentage: "",
    stockQuantity: "",
    sku: "",
    description: "",
    inStock: true,
    isFeatured: false,
    offerEndDate: "",
  });

  // ── Category & subcategory selection ───────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<Set<string>>(new Set());

  // ── Badge selection ────────────────────────────────────────────────────────
  const [selectedBadges, setSelectedBadges] = useState<Set<string>>(new Set());

  // ── Image state ────────────────────────────────────────────────────────────
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // ── Specifications (key-value pairs) ───────────────────────────────────────
  const [specifications, setSpecifications] = useState<SpecRow[]>([
    { key: "Brand", value: "" },
  ]);

  // ── Gallery upload state ───────────────────────────────────────────────────
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const [galleryError, setGalleryError] = useState<string | null>(null);
  const [isGalleryDragOver, setIsGalleryDragOver] = useState(false);
  const [galleryTab, setGalleryTab] = useState<"upload" | "url">("upload");
  const [galleryUrlInput, setGalleryUrlInput] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Filtered subcategories for the selected category ───────────────────────
  const availableSubCategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories.filter((sub) => {
      const subCatParentId = sub.categoryId;
      return (
        subCatParentId === selectedCategoryId ||
        String(subCatParentId) === String(selectedCategoryId)
      );
    });
  }, [selectedCategoryId, subcategories]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const title = e.target.value;
    setFormState((prev) => ({ ...prev, title, slug: generateSlug(title) }));
  }

  function handlePriceChange(newPrice: string, newOriginalPrice: string) {
    const price = parseFloat(newPrice);
    const originalPrice = parseFloat(newOriginalPrice);

    const discount =
      price && originalPrice && originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100).toString()
        : "";

    setFormState((prev) => ({
      ...prev,
      price: newPrice,
      originalPrice: newOriginalPrice,
      discountPercentage: discount,
    }));
  }

  const hasPositiveStock = useMemo(() => {
    const qty = parseInt(formState.stockQuantity, 10);
    return !isNaN(qty) && qty > 0;
  }, [formState.stockQuantity]);

  function handleStockQuantityChange(val: string) {
    const qty = parseInt(val, 10);
    const isPositive = !isNaN(qty) && qty > 0;
    setFormState((prev) => ({
      ...prev,
      stockQuantity: val,
      inStock: isPositive ? true : prev.inStock,
    }));
  }

  function handleCategoryChange(categoryId: string) {
    setSelectedCategoryId(categoryId);
    setSelectedSubCategoryIds(new Set());
  }

  function addSpecification() {
    setSpecifications((prev) => [...prev, { key: "", value: "" }]);
  }

  function updateSpecification(index: number, field: "key" | "value", value: string) {
    setSpecifications((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  function removeSpecification(index: number) {
    setSpecifications((prev) => prev.filter((_, i) => i !== index));
  }

  function removeGalleryImage(index: number) {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleGalleryFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      setGalleryError("Please select valid image files.");
      return;
    }

    setIsGalleryUploading(true);
    setGalleryError(null);

    try {
      const urls = await Promise.all(imageFiles.map(uploadToImgBB));
      setGalleryImages((prev) => [...prev, ...urls]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setGalleryError(message);
    } finally {
      setIsGalleryUploading(false);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
    }
  }

  function handleGalleryUrlsAdd() {
    const urls = galleryUrlInput
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);

    if (urls.length > 0) {
      setGalleryImages((prev) => [...prev, ...urls]);
      setGalleryUrlInput("");
    }
  }

  // ── Form submit ─────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedCategoryId) {
      toast.error("Please select a primary category");
      return;
    }

    if (!mainImageUrl) {
      toast.error("Please provide a main display image");
      return;
    }

    setIsSubmitting(true);

    const specObj: Record<string, string> = {};
    specifications.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        specObj[s.key.trim()] = s.value.trim();
      }
    });

    const payload = {
      title: formState.title,
      slug: formState.slug,
      categoryId: selectedCategoryId,
      subCategoryIds: Array.from(selectedSubCategoryIds),
      price: parseFloat(formState.price) || 0,
      originalPrice: formState.originalPrice ? parseFloat(formState.originalPrice) : undefined,
      investPrice: formState.investPrice ? parseFloat(formState.investPrice) : undefined,
      stockQuantity: formState.stockQuantity ? parseInt(formState.stockQuantity, 10) : undefined,
      sku: formState.sku || undefined,
      description: formState.description || undefined,
      image: mainImageUrl,
      additionalImages: galleryImages,
      badges: Array.from(selectedBadges),
      specifications: Object.keys(specObj).length > 0 ? specObj : undefined,
      inStock: hasPositiveStock ? true : formState.inStock,
      isFeatured: formState.isFeatured,
      offerEndDate: formState.offerEndDate ? new Date(formState.offerEndDate).toISOString() : undefined,
    };

    try {
      const result = await addProduct(payload);
      if (result?.success) {
        toast.success("Product added successfully!");
        router.push("/dashboard/admin/products");
        router.refresh();
      } else {
        toast.error(result?.message || "Failed to add product");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to add product";
      toast.error(message);
      console.error("Failed to add product:", err);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Shared CSS classes ──────────────────────────────────────────────────────
  const cardClass =
    "border border-slate-200/80 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 rounded-2xl";

  const labelClass = "text-xs font-semibold text-gray-700 dark:text-gray-300";
  const fieldClass = "flex flex-col gap-1";
  const sectionHeadingClass =
    "text-base font-bold text-gray-900 dark:text-white flex items-center gap-2";

  const addBtnClass =
    "w-fit text-xs font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-950/50 rounded-xl px-4 py-2 inline-flex items-center gap-1.5 transition-colors cursor-pointer";

  const switchRowClass =
    "flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-800/40 rounded-xl border border-slate-200/60 dark:border-gray-800 cursor-pointer";

  const tabBtnClass = (active: boolean) =>
    `flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
      active
        ? "bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 shadow-sm"
        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    }`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
          Add New{" "}
          <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Product
          </span>
        </h1>
        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create a product entry mapped to your standard Product interface type.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ════════════════════════════════════════════════════════
              LEFT COLUMN (spans 7 of 12 columns)
          ════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 space-y-6">
            {/* ── Section: General Information ── */}
            <Card className={cardClass}>
              <Card.Content className="p-6 space-y-5">
                <h2 className={sectionHeadingClass}>
                  <PackagePlus className="w-4 h-4 text-sky-500" />
                  General Information
                </h2>

                <div className={fieldClass}>
                  <label className={labelClass}>
                    Product Title <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="title"
                    placeholder="e.g. Premium Noise-Canceling Earbud Case"
                    value={formState.title}
                    onChange={handleTitleChange}
                    required
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>
                    Slug <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="slug"
                    placeholder="premium-noise-canceling-earbud-case"
                    value={formState.slug}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        slug: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>Description</label>
                  <TextArea
                    name="description"
                    placeholder="Comprehensive description of the product..."
                    value={formState.description}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={4}
                  />
                </div>
              </Card.Content>
            </Card>

            {/* ── Section: Product Media ── */}
            <Card className={cardClass}>
              <Card.Content className="p-6 space-y-6">
                <h2 className={sectionHeadingClass}>
                  <ImageIcon className="w-4 h-4 text-sky-500" />
                  Product Media
                </h2>

                {/* Main image */}
                <ImageUploader
                  label="Main Display Image"
                  name="image"
                  required
                  value={mainImageUrl}
                  onChange={setMainImageUrl}
                  urlPlaceholder="https://example.com/product-main.webp"
                />

                {/* Gallery */}
                <div className="flex flex-col gap-3 pt-4 border-t border-slate-100 dark:border-gray-800">
                  <label className={labelClass}>
                    Gallery Images
                    {galleryImages.length > 0 && (
                      <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                        {galleryImages.length}
                      </span>
                    )}
                  </label>

                  <div className="flex gap-1 p-1 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/40 w-fit">
                    <button
                      type="button"
                      onClick={() => setGalleryTab("upload")}
                      className={tabBtnClass(galleryTab === "upload")}
                    >
                      <Upload className="w-3 h-3" />
                      Upload Files
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryTab("url")}
                      className={tabBtnClass(galleryTab === "url")}
                    >
                      <Link2 className="w-3 h-3" />
                      Image URLs
                    </button>
                  </div>

                  {galleryTab === "upload" && (
                    <div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          !isGalleryUploading &&
                          galleryFileInputRef.current?.click()
                        }
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          !isGalleryUploading &&
                          galleryFileInputRef.current?.click()
                        }
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsGalleryDragOver(true);
                        }}
                        onDragLeave={() => setIsGalleryDragOver(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsGalleryDragOver(false);
                          handleGalleryFiles(e.dataTransfer.files);
                        }}
                        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 transition-all cursor-pointer select-none
                          ${
                            isGalleryDragOver
                              ? "border-sky-400 bg-sky-50 dark:bg-sky-950/20"
                              : "border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/30 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/50 dark:hover:bg-sky-950/10"
                          }
                          ${isGalleryUploading ? "pointer-events-none opacity-70" : ""}
                        `}
                      >
                        {isGalleryUploading ? (
                          <>
                            <Loader2 className="w-7 h-7 text-sky-500 animate-spin" />
                            <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                              Uploading to ImgBB…
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-sky-500" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                Click to browse or drag & drop
                              </p>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                Select multiple images at once — all uploaded to ImgBB
                              </p>
                            </div>
                          </>
                        )}
                      </div>

                      <input
                        ref={galleryFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.length)
                            handleGalleryFiles(e.target.files);
                        }}
                      />
                    </div>
                  )}

                  {galleryTab === "url" && (
                    <div className="flex flex-col gap-2">
                      <textarea
                        rows={4}
                        placeholder={`https://example.com/image1.webp\nhttps://example.com/image2.webp\n...one URL per line`}
                        value={galleryUrlInput}
                        onChange={(e) => setGalleryUrlInput(e.target.value)}
                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
                      />
                      <button
                        type="button"
                        onClick={handleGalleryUrlsAdd}
                        disabled={!galleryUrlInput.trim()}
                        className={`${addBtnClass} disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add URLs
                      </button>
                    </div>
                  )}

                  {galleryError && (
                    <p className="text-[10px] font-semibold text-rose-500">
                      {galleryError}
                    </p>
                  )}

                  {galleryImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {galleryImages.map((url, index) => (
                        <div
                          key={index}
                          className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 aspect-square bg-slate-100 dark:bg-gray-800"
                        >
                          <img
                            src={url}
                            alt={`Gallery ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute top-1 right-1 p-1 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:bg-rose-500/80"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 inset-x-0 bg-black/40 text-[9px] text-white text-center py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            #{index + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>

            {/* ── Section: Specifications ── */}
            <Card className={cardClass}>
              <Card.Content className="p-6 space-y-4">
                <h2 className={sectionHeadingClass}>
                  <Layers className="w-4 h-4 text-sky-500" />
                  Specifications
                </h2>

                <div className="space-y-2">
                  {specifications.map((spec, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        placeholder="Key (e.g. Brand)"
                        value={spec.key}
                        onChange={(e) =>
                          updateSpecification(index, "key", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value (e.g. Sony)"
                        value={spec.value}
                        onChange={(e) =>
                          updateSpecification(index, "value", e.target.value)
                        }
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecification(index)}
                        className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  onPress={addSpecification}
                  className={addBtnClass}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Specification
                </Button>
              </Card.Content>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════
              RIGHT COLUMN (sidebar spans 5 of 12 columns)
          ════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-6">
            {/* ── Section: Pricing & Stock ── */}
            <Card className={cardClass}>
              <Card.Content className="p-6 space-y-4">
                <h2 className={sectionHeadingClass}>
                  <DollarSign className="w-4 h-4 text-sky-500" />
                  Pricing & Stock
                </h2>

                <div className={fieldClass}>
                  <label className={labelClass}>
                    Selling Price ($) <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    name="price"
                    type="number"
                    step="0.01"
                    placeholder="24.99"
                    value={formState.price}
                    onChange={(e) =>
                      handlePriceChange(e.target.value, formState.originalPrice)
                    }
                    required
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>Original Price ($)</label>
                  <Input
                    name="originalPrice"
                    type="number"
                    step="0.01"
                    placeholder="124.99"
                    value={formState.originalPrice}
                    onChange={(e) =>
                      handlePriceChange(formState.price, e.target.value)
                    }
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>
                    Invest / Cost Price ($)
                    <span className="ml-1 text-[10px] font-normal text-amber-500">(admin only)</span>
                  </label>
                  <Input
                    name="investPrice"
                    type="number"
                    step="0.01"
                    placeholder="8.99"
                    value={formState.investPrice}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, investPrice: e.target.value }))
                    }
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>Discount (%)</label>
                  <Input
                    name="discountPercentage"
                    type="number"
                    placeholder="Auto-calculated"
                    value={formState.discountPercentage}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        discountPercentage: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>Stock Quantity</label>
                  <Input
                    name="stockQuantity"
                    type="number"
                    placeholder="100"
                    value={formState.stockQuantity}
                    onChange={(e) => handleStockQuantityChange(e.target.value)}
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>SKU</label>
                  <Input
                    name="sku"
                    placeholder="ACC-CASE-001"
                    value={formState.sku}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        sku: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* ── Countdown / Special Deal End Date ── */}
                <HeroUIDateTimePicker
                  label="Deal Countdown End Date & Time"
                  value={formState.offerEndDate}
                  onChange={(isoString) =>
                    setFormState((prev) => ({
                      ...prev,
                      offerEndDate: isoString,
                    }))
                  }
                  helperText="When the countdown timer finishes, the product price will automatically reset to original price."
                />
              </Card.Content>
            </Card>

            {/* ── Section: Categories & Subcategories ── */}
            <Card className={cardClass}>
              <Card.Content className="p-6 space-y-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Categories & Subcategories
                </h2>

                {/* Primary category dropdown */}
                <div className={fieldClass}>
                  <label className={labelClass}>
                    Primary Category <span className="text-rose-500">*</span>
                  </label>
                  {categories.length === 0 ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                      No categories found. Please add a category first.
                    </div>
                  ) : (
                    <Select
                      selectedKey={selectedCategoryId || null}
                      onSelectionChange={(key) =>
                        handleCategoryChange(key ? String(key) : "")
                      }
                      placeholder="Select product category"
                      isRequired
                    >
                      <Select.Trigger className="w-full cursor-pointer">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {categories.map((cat) => {
                            const catId = (cat._id || cat.id || cat.slug) as string;
                            return (
                              <ListBox.Item
                                key={catId}
                                id={catId}
                                textValue={cat.name}
                                className="cursor-pointer"
                              >
                                {cat.name}
                              </ListBox.Item>
                            );
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  )}
                </div>

                {/* Subcategory multi-select */}
                <div className={`${fieldClass} pt-1`}>
                  <label className={labelClass}>Subcategories</label>

                  {!selectedCategoryId ? (
                    <div className="p-3 bg-slate-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-slate-200 dark:border-gray-800 text-center">
                      <p className="text-xs text-gray-400">
                        Please select a category above to load subcategories.
                      </p>
                    </div>
                  ) : availableSubCategories.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">
                      No subcategories available for this category.
                    </p>
                  ) : (
                    <>
                      <Select
                        placeholder="Select subcategories"
                        onSelectionChange={(keys) => {
                          if (keys && typeof keys === "object") {
                            setSelectedSubCategoryIds(
                              new Set(
                                Array.from(
                                  keys as unknown as Iterable<unknown>
                                ).map(String)
                              )
                            );
                          }
                        }}
                      >
                        <Select.Trigger className="w-full cursor-pointer">
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {availableSubCategories.map((sub) => {
                              const subId = (sub._id || sub.id || sub.slug) as string;
                              return (
                                <ListBox.Item
                                  key={subId}
                                  id={subId}
                                  textValue={sub.name}
                                  className="cursor-pointer"
                                >
                                  {sub.name}
                                </ListBox.Item>
                              );
                            })}
                          </ListBox>
                        </Select.Popover>
                      </Select>

                      {selectedSubCategoryIds.size > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {Array.from(selectedSubCategoryIds).map((id) => {
                            const label =
                              availableSubCategories.find(
                                (s) => (s._id || s.id || s.slug) === id
                              )?.name ?? id;
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300"
                              >
                                {label}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedSubCategoryIds((prev) => {
                                      const next = new Set(prev);
                                      next.delete(id);
                                      return next;
                                    })
                                  }
                                  className="cursor-pointer hover:opacity-75"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card.Content>
            </Card>

            {/* ── Section: Badges & Visibility ── */}
            <Card className={cardClass}>
              <Card.Content className="p-6 space-y-4">
                <h2 className={sectionHeadingClass}>
                  <Sparkles className="w-4 h-4 text-sky-500" />
                  Badges & Visibility
                </h2>

                <div className={fieldClass}>
                  <label className={labelClass}>Product Badges</label>
                  <Select
                    placeholder="Select promotional badges"
                    onSelectionChange={(keys) => {
                      if (keys && typeof keys === "object") {
                        setSelectedBadges(
                          new Set(
                            Array.from(
                              keys as unknown as Iterable<unknown>
                            ).map(String)
                          )
                        );
                      }
                    }}
                  >
                    <Select.Trigger className="w-full cursor-pointer">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {AVAILABLE_BADGES.map((badge) => (
                          <ListBox.Item
                            key={badge.id}
                            id={badge.id}
                            textValue={badge.label}
                            className="cursor-pointer"
                          >
                            {badge.label}
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  {selectedBadges.size > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {Array.from(selectedBadges).map((bId) => {
                        const badgeObj = AVAILABLE_BADGES.find((b) => b.id === bId);
                        return (
                          <span
                            key={bId}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                          >
                            {badgeObj?.label ?? bId}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedBadges((prev) => {
                                  const next = new Set(prev);
                                  next.delete(bId);
                                  return next;
                                })
                              }
                              className="cursor-pointer hover:opacity-75"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* In Stock toggle */}
                <div className={switchRowClass}>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      In Stock
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {hasPositiveStock
                        ? "Automatically enabled (Stock > 0)"
                        : "Mark if product is ready for purchase"}
                    </p>
                  </div>
                  <Switch
                    isSelected={hasPositiveStock ? true : formState.inStock}
                    isDisabled={hasPositiveStock}
                    onChange={(val) => {
                      if (!hasPositiveStock) {
                        setFormState((prev) => ({ ...prev, inStock: val }));
                      }
                    }}
                    className={hasPositiveStock ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
                  >
                    <Switch.Content className={hasPositiveStock ? "cursor-not-allowed" : "cursor-pointer"}>
                      <Switch.Control className={hasPositiveStock ? "cursor-not-allowed" : "cursor-pointer"}>
                        <Switch.Thumb className={hasPositiveStock ? "cursor-not-allowed" : "cursor-pointer"} />
                      </Switch.Control>
                    </Switch.Content>
                  </Switch>
                </div>

                {/* Featured toggle */}
                <div className={switchRowClass}>
                  <div>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                      Featured
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Promote in featured grids
                    </p>
                  </div>
                  <Switch
                    isSelected={formState.isFeatured}
                    onChange={(val) =>
                      setFormState((prev) => ({ ...prev, isFeatured: val }))
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
              </Card.Content>
            </Card>

            {/* ── Save button ── */}
            <Button
              type="submit"
              isDisabled={isSubmitting || categories.length === 0}
              className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-bold text-xs py-6 rounded-2xl shadow-sm inline-flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {isSubmitting ? "Saving Product..." : "Save Product"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
