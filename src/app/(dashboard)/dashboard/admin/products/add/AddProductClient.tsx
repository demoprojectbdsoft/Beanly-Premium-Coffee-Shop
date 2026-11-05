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
  Shield,
} from "lucide-react";
import { Category, SubCategory } from "@/types";
import ImageUploader from "@/components/shared/ImageUploader";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";
import { addProduct } from "@/lib/action/products";
import { WARRANTY_TYPE_OPTIONS } from "@/lib/warranty";
import { hasOfferDiscount } from "@/lib/offer";
import { hasBrandSpec } from "@/lib/productSpecs";
import { recalcPricing } from "@/lib/pricing";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useDemoAdmin } from "@/hooks/useDemoAdmin";
import { useSiteSettings } from "@/context/SiteSettingsContext";

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
  const { currencySymbol } = useSiteSettings();

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
    warrantyPeriodMonths: "",
    warrantyType: "manufacturer-warranty",
    warrantyTerms: "",
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

  // Price or original price is the source: the discount percentage follows.
  function handlePriceChange(newPrice: string, newOriginalPrice: string) {
    setFormState((prev) => ({
      ...prev,
      ...recalcPricing(
        { price: newPrice, originalPrice: newOriginalPrice, discountPercentage: prev.discountPercentage },
        "price"
      ),
    }));
  }

  // Discount percentage is the source: the selling price follows from the
  // original price (or the original price follows from the selling price).
  function handleDiscountChange(newDiscount: string) {
    setFormState((prev) => ({
      ...prev,
      ...recalcPricing(
        { price: prev.price, originalPrice: prev.originalPrice, discountPercentage: newDiscount },
        "discountPercentage"
      ),
    }));
  }

  const hasPositiveStock = useMemo(() => {
    const qty = parseInt(formState.stockQuantity, 10);
    return !isNaN(qty) && qty > 0;
  }, [formState.stockQuantity]);

  // A blank field means the product is not stock-tracked, so it can never sell out
  // and the In Stock switch has nothing to control.
  const stockTracked = useMemo(
    () => formState.stockQuantity.trim() !== "" && !isNaN(parseInt(formState.stockQuantity, 10)),
    [formState.stockQuantity]
  );

  // A countdown is only offered when the original price is actually higher than
  // the selling price. Equal prices would run a timer for a deal nobody gets.
  const hasDiscount = hasOfferDiscount(formState.price, formState.originalPrice);

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

    // The warranty has to agree with itself before it reaches the API. A covering
    // type with no period, or an "Other" type with no terms, would be stored as
    // no warranty at all — the opposite of what the admin just chose.
    const warrantyMonths = parseInt(formState.warrantyPeriodMonths || "0", 10) || 0;
    if (formState.warrantyType !== "none" && warrantyMonths <= 0) {
      toast.error("Set a warranty period of at least 1 month, or choose No Warranty.");
      return;
    }
    if (formState.warrantyType === "other" && !formState.warrantyTerms.trim()) {
      toast.error("Describe the coverage in Warranty Terms for an Other warranty.");
      return;
    }

    const specObj: Record<string, string> = {};
    specifications.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        specObj[s.key.trim()] = s.value.trim();
      }
    });

    // A manufacturer warranty is claimed from the brand, so the specs have to
    // carry one before the product is saved.
    if (formState.warrantyType === "manufacturer-warranty" && !hasBrandSpec(specObj)) {
      toast.error("Add the brand in Specifications — a manufacturer warranty is claimed from the brand.");
      return;
    }

    setIsSubmitting(true);

    const payload = {
      title: formState.title,
      slug: formState.slug,
      categoryId: selectedCategoryId,
      subCategoryIds: Array.from(selectedSubCategoryIds),
      price: parseFloat(formState.price) || 0,
      originalPrice: formState.originalPrice ? parseFloat(formState.originalPrice) : undefined,
      investPrice: formState.investPrice ? parseFloat(formState.investPrice) : undefined,
      // Blank means "not stock-tracked", which the server stores as null so no
      // page ever counts, hides or limits this product.
      stockQuantity: stockTracked ? parseInt(formState.stockQuantity, 10) : null,
      sku: formState.sku || undefined,
      description: formState.description || undefined,
      image: mainImageUrl,
      additionalImages: galleryImages,
      badges: Array.from(selectedBadges),
      specifications: Object.keys(specObj).length > 0 ? specObj : undefined,
      inStock: hasPositiveStock ? true : formState.inStock,
      isFeatured: formState.isFeatured,
      warrantyPeriodMonths: formState.warrantyPeriodMonths
        ? parseInt(formState.warrantyPeriodMonths, 10)
        : undefined,
      warrantyType: formState.warrantyType,
      warrantyTerms: formState.warrantyTerms || undefined,
      offerEndDate:
        hasDiscount && formState.offerEndDate
          ? new Date(formState.offerEndDate).toISOString()
          : undefined,
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
    "border border-[var(--border-color)] shadow-sm bg-[var(--surface-elevated)] rounded-2xl";

  const labelClass = "text-xs font-semibold text-[var(--foreground)]";
  const fieldClass = "flex flex-col gap-1";
  const sectionHeadingClass =
    "text-base font-bold text-[var(--foreground)] flex items-center gap-2";

  const addBtnClass =
    "w-fit text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-xl px-4 py-2 inline-flex items-center gap-1.5 transition-colors cursor-pointer";

  const switchRowClass =
    "flex items-center justify-between p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)] cursor-pointer";
  // The same row without the hand cursor, for a row that only explains itself.
  const switchRowStaticClass =
    "flex items-center justify-between p-3 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]";

  const tabBtnClass = (active: boolean) =>
    `flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
      active
        ? "bg-[var(--surface-elevated)] text-primary shadow-sm"
        : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
    }`;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
          Add New{" "}
          <span className="text-gradient-primary">
            Product
          </span>
        </h1>
        <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
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
                  <PackagePlus className="w-4 h-4 text-primary" />
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
                  <ImageIcon className="w-4 h-4 text-primary" />
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
                <div className="flex flex-col gap-3 pt-4 border-t border-[var(--border-color)]">
                  <label className={labelClass}>
                    Gallery Images
                    {galleryImages.length > 0 && (
                      <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        {galleryImages.length}
                      </span>
                    )}
                  </label>

                  <div className="flex gap-1 p-1 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] w-fit">
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
                              ? "border-primary bg-primary/10"
                              : "border-[var(--border-color)] bg-[var(--surface-alt)] hover:border-primary/50 hover:bg-primary/5"
                          }
                          ${isGalleryUploading ? "pointer-events-none opacity-70" : ""}
                        `}
                      >
                        {isGalleryUploading ? (
                          <>
                            <Loader2 className="w-7 h-7 text-primary animate-spin" />
                            <p className="text-xs font-semibold text-primary">
                              Uploading to ImgBB…
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <ImageIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-bold text-[var(--foreground)]">
                                Click to browse or drag & drop
                              </p>
                              <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
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
                        className="w-full text-xs rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] px-3 py-2.5 resize-none outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
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
                          className="relative group rounded-xl overflow-hidden border border-[var(--border-color)] aspect-square bg-[var(--surface-alt)]"
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
                  <Layers className="w-4 h-4 text-primary" />
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

            {/* ── Section: Warranty ── */}
            <Card className={cardClass}>
              <Card.Content className="p-6 space-y-4">
                <h2 className={sectionHeadingClass}>
                  <Shield className="w-4 h-4 text-primary" />
                  Warranty
                </h2>

                <div className={fieldClass}>
                  <label className={labelClass}>Warranty Period (months)</label>
                  <Input
                    name="warrantyPeriodMonths"
                    type="number"
                    min="1"
                    max="120"
                    step="1"
                    placeholder="e.g. 12"
                    disabled={formState.warrantyType === "none"}
                    value={formState.warrantyPeriodMonths}
                    onChange={(e) =>
                      setFormState((prev) => ({
                        ...prev,
                        warrantyPeriodMonths: e.target.value,
                      }))
                    }
                  />
                  <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                    When a customer buys this product and the order is delivered, a
                    warranty record is automatically created for this number of months.
                    A period of 0 issues nothing, and <span className="font-semibold">No
                    Warranty</span> means a claim can never be filed.
                  </p>
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>Warranty Type</label>
                  <Select
                    selectedKey={formState.warrantyType}
                    onSelectionChange={(key) => {
                      const warrantyType = String(key);
                      // "No warranty" clears the period so the two fields can
                      // never contradict each other.
                      setFormState((prev) => ({
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
                      WARRANTY_TYPE_OPTIONS.find((o) => o.value === formState.warrantyType)
                        ?.customerAction
                    }
                  </p>
                  {formState.warrantyType === "manufacturer-warranty" && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                      Fill in the Brand row in Specifications — the brand carries this warranty.
                    </p>
                  )}
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>
                    Warranty Terms
                    {formState.warrantyType === "other" && (
                      <span className="text-rose-500"> *</span>
                    )}
                  </label>
                  <TextArea
                    name="warrantyTerms"
                    placeholder="e.g. Covers manufacturing defects for 12 months from delivery date..."
                    value={formState.warrantyTerms}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, warrantyTerms: e.target.value }))
                    }
                    rows={3}
                  />
                  <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                    Shown to customers on the product page and on the warranty record.
                    Required when the type is <span className="font-semibold">Other warranty</span>.
                  </p>
                </div>
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
                  <DollarSign className="w-4 h-4 text-primary" />
                  Pricing & Stock
                </h2>

                <div className={fieldClass}>
                  <label className={labelClass}>
                    Selling Price ({currencySymbol}) <span className="text-rose-500">*</span>
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
                  <label className={labelClass}>Original Price ({currencySymbol})</label>
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
                    Invest / Cost Price ({currencySymbol})
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
                    onChange={(e) => handleDiscountChange(e.target.value)}
                  />
                </div>

                <div className={fieldClass}>
                  <label className={labelClass}>
                    Stock Quantity
                    <span className="ml-1 text-[10px] font-normal text-[var(--foreground-muted)]">(optional)</span>
                  </label>
                  <Input
                    name="stockQuantity"
                    type="number"
                    min="0"
                    placeholder="Leave blank to skip stock tracking"
                    value={formState.stockQuantity}
                    onChange={(e) => handleStockQuantityChange(e.target.value)}
                  />
                  <p className="text-[10px] text-[var(--foreground-muted)] mt-1">
                    Leave blank if you do not count stock for this product. It is then
                    always available, with no unit limit and never marked out of stock.
                  </p>
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

                {/* ── Countdown / Special Deal End Date, only for a real discount ── */}
                {hasDiscount ? (
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
                ) : (
                  <p className="text-[11px] text-[var(--foreground-muted)] bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                    Set an original price higher than the selling price to run a deal
                    countdown. With both prices the same there is no offer to count down.
                  </p>
                )}
              </Card.Content>
            </Card>

            {/* ── Section: Categories & Subcategories ── */}
            <Card className={cardClass}>
              <Card.Content className="p-6 space-y-4">
                <h2 className="text-base font-bold text-[var(--foreground)]">
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
                    <div className="p-3 bg-[var(--surface-alt)] dark:bg-[var(--surface)]/30 rounded-xl border border-dashed border-[var(--border-color)] dark:border-[var(--border-color)] text-center">
                      <p className="text-xs text-[var(--foreground-muted)]">
                        Please select a category above to load subcategories.
                      </p>
                    </div>
                  ) : availableSubCategories.length === 0 ? (
                    <p className="text-xs text-[var(--foreground-muted)] italic">
                      No subcategories available for this category.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {availableSubCategories.map((sub) => {
                          const subId = (sub._id || sub.id || sub.slug) as string;
                          const isSelected = selectedSubCategoryIds.has(subId);
                          return (
                            <button
                              type="button"
                              key={subId}
                              onClick={() => {
                                setSelectedSubCategoryIds((prev) => {
                                  const next = new Set(prev);
                                  if (isSelected) next.delete(subId);
                                  else next.add(subId);
                                  return next;
                                });
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 border ${
                                isSelected
                                  ? "bg-primary text-white border-primary shadow-xs"
                                  : "bg-[var(--surface-alt)] text-[var(--foreground)] hover:bg-[var(--surface-alt)]/80 border-[var(--border-color)]"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                      {selectedSubCategoryIds.size > 0 && (
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-[var(--foreground-muted)]">
                            {selectedSubCategoryIds.size} subcategor{selectedSubCategoryIds.size > 1 ? "ies" : "y"} selected
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedSubCategoryIds(new Set())}
                            className="text-[11px] text-primary hover:underline cursor-pointer"
                          >
                            Clear
                          </button>
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
                  <Sparkles className="w-4 h-4 text-primary" />
                  Badges & Visibility
                </h2>

                <div className={fieldClass}>
                  <div className="flex items-center justify-between">
                    <label className={labelClass}>Product Badges</label>
                    {selectedBadges.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedBadges(new Set())}
                        className="text-[11px] text-primary hover:underline cursor-pointer"
                      >
                        Clear all ({selectedBadges.size})
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    Click to select one or multiple badges to highlight this product.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {AVAILABLE_BADGES.map((b) => {
                      const isSelected = selectedBadges.has(b.id);
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => {
                            setSelectedBadges((prev) => {
                              const next = new Set(prev);
                              if (isSelected) next.delete(b.id);
                              else next.add(b.id);
                              return next;
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 border ${
                            isSelected
                              ? "bg-primary text-white border-primary shadow-xs"
                              : "bg-[var(--surface-alt)] text-[var(--foreground)] hover:bg-[var(--surface-alt)]/80 border-[var(--border-color)]"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* In Stock toggle — only for a product with a stock count */}
                <div className={switchRowStaticClass}>
                  <div>
                    <p className="text-xs font-bold text-[var(--foreground)]">
                      In Stock
                    </p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      {!stockTracked
                        ? "Not tracked — the product is always available"
                        : hasPositiveStock
                          ? "Automatically enabled (Stock > 0)"
                          : "Mark if product is ready for purchase"}
                    </p>
                  </div>
                  {stockTracked && (
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
                  )}
                </div>

                {/* Featured toggle */}
                <div className={switchRowClass}>
                  <div>
                    <p className="text-xs font-bold text-[var(--foreground)]">
                      Featured
                    </p>
                    <p className="text-[10px] text-[var(--foreground-muted)]">
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
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold text-xs py-6 rounded-2xl shadow-md shadow-primary/20 inline-flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
