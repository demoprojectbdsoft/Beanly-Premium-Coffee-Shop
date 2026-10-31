"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import ImageUploader from "@/components/shared/ImageUploader";
import { createVendorProduct, updateVendorProduct } from "@/lib/action/vendor";
import type { Category, SubCategory } from "@/types";
import type {
  VendorProduct,
  VendorProductDraft,
  VendorProductPlan,
  VendorProductShipping,
  VendorProductVariant,
} from "@/types/vendor";
import { formatTaka, getVendorProductStatusStyle } from "@/lib/vendorProductStatus";

/**
 * The product editor, shared by "Add product" and every edit afterwards.
 *
 * The form mirrors what the API accepts and nothing more: ownership, slug,
 * featured placement and the vendor id are decided on the server. "Save draft"
 * never touches the plan limit; publish does, so a vendor at their limit is told
 * before the request rather than by a failed one.
 */

interface VendorProductFormProps {
  mode: "create" | "edit";
  product?: VendorProduct;
  categories: Category[];
  subCategories: SubCategory[];
  plan: VendorProductPlan;
}

type SpecRow = { key: string; value: string };
type VariantRow = { name: string; values: string };

const inputClass =
  "h-9 w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 text-[11px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35";

const labelClass =
  "mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--foreground-muted)]";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-[var(--foreground-muted)]">{hint}</p>}
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Save;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
      <h2 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
        <Icon className="h-3.5 w-3.5 text-[var(--brand-flat)]" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function toSpecRows(specifications?: Record<string, string>): SpecRow[] {
  const rows = Object.entries(specifications ?? {}).map(([key, value]) => ({
    key,
    value: String(value ?? ""),
  }));
  return rows.length ? rows : [{ key: "", value: "" }];
}

function toVariantRows(variants?: VendorProductVariant[]): VariantRow[] {
  return (variants ?? []).map((variant) => ({
    name: variant.name,
    values: (variant.values ?? []).join(", "),
  }));
}

export default function VendorProductForm({
  mode,
  product,
  categories,
  subCategories,
  plan,
}: VendorProductFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(product?.title ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [categoryId, setCategoryId] = useState(
    typeof product?.categoryId === "string"
      ? product.categoryId
      : product?.categoryId?._id || product?.categoryId?.id || ""
  );
  const [selectedSubs, setSelectedSubs] = useState<string[]>(
    (product?.subCategoryIds ?? [])
      .map((sub) => sub._id || sub.id || "")
      .filter(Boolean)
  );
  const [price, setPrice] = useState(product?.price != null ? String(product.price) : "");
  const [originalPrice, setOriginalPrice] = useState(
    product?.originalPrice != null ? String(product.originalPrice) : ""
  );
  const [stockQuantity, setStockQuantity] = useState(
    product?.stockQuantity != null ? String(product.stockQuantity) : ""
  );
  const [sku, setSku] = useState(product?.sku ?? "");
  const [image, setImage] = useState(product?.image ?? "");
  const [gallery, setGallery] = useState<string[]>(product?.additionalImages ?? []);
  const [description, setDescription] = useState(product?.description ?? "");
  const [specs, setSpecs] = useState<SpecRow[]>(() => toSpecRows(product?.specifications));
  const [variants, setVariants] = useState<VariantRow[]>(() => toVariantRows(product?.variantOptions));

  const [shipping, setShipping] = useState<VendorProductShipping>({
    weightKg: product?.shippingInfo?.weightKg ?? null,
    deliveryDays: product?.shippingInfo?.deliveryDays ?? null,
    freeShipping: product?.shippingInfo?.freeShipping ?? false,
    note: product?.shippingInfo?.note ?? "",
  });

  const [isVisible, setIsVisible] = useState(product?.isVisible !== false);
  const [saving, setSaving] = useState<"draft" | "publish" | "save" | null>(null);

  const visibleSubs = useMemo(
    () =>
      subCategories.filter((sub) => {
        const parentId =
          typeof sub.categoryId === "string"
            ? sub.categoryId
            : (sub.categoryId as unknown as { _id?: string; id?: string })?._id ||
              (sub.categoryId as unknown as { id?: string })?.id;
        return !categoryId || parentId === categoryId;
      }),
    [subCategories, categoryId]
  );

  const statusStyle = getVendorProductStatusStyle(product?.vendorProductStatus);
  const StatusIcon = statusStyle.icon;

  const buildPayload = () => {
    const specifications = specs.reduce<Record<string, string>>((all, row) => {
      const key = row.key.trim();
      if (key) all[key] = row.value.trim();
      return all;
    }, {});

    const variantOptions = variants
      .map((row) => ({
        name: row.name.trim(),
        values: row.values
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      }))
      .filter((row) => row.name && row.values.length);

    const payload: Partial<VendorProductDraft> & {
      title: string;
      categoryId: string;
      price: number;
      image: string;
    } = {
      title: title.trim(),
      brand: brand.trim(),
      categoryId,
      subCategoryIds: selectedSubs,
      price: Number(price),
      originalPrice: originalPrice ? Number(originalPrice) : null,
      image,
      additionalImages: gallery,
      stockQuantity: stockQuantity === "" ? null : Number(stockQuantity),
      sku: sku.trim(),
      description: description.trim(),
      specifications,
      variantOptions,
      shippingInfo: shipping,
      isVisible,
    };

    return payload;
  };

  const validate = () => {
    if (title.trim().length < 2) {
      toast.warning("Give the product a title.");
      return false;
    }
    if (!categoryId) {
      toast.warning("Choose a category.");
      return false;
    }
    if (!(Number(price) > 0)) {
      toast.warning("Enter a price greater than zero.");
      return false;
    }
    if (!image) {
      toast.warning("Add the main product image.");
      return false;
    }
    return true;
  };

  const save = async (intent: "draft" | "publish" | "save") => {
    if (saving) return;
    if (!validate()) return;

    if (intent === "publish" && plan.used >= plan.maxProducts && product?.vendorProductStatus !== "published") {
      toast.warning(
        `Your ${plan.name} plan allows ${plan.maxProducts} live products. Archive one or upgrade to publish.`
      );
      return;
    }

    setSaving(intent);
    try {
      const payload = buildPayload();

      const res =
        mode === "create"
          ? await createVendorProduct(payload, intent === "publish")
          : await updateVendorProduct(product!._id, {
              ...payload,
              status:
                intent === "publish"
                  ? "published"
                  : intent === "draft"
                    ? "draft"
                    : undefined,
            });

      if (res?.success === false) {
        toast.error(res.message || "The product could not be saved");
        return;
      }

      toast.success(
        intent === "publish"
          ? "Product published"
          : intent === "draft"
            ? "Draft saved"
            : "Product saved"
      );
      router.push("/dashboard/vendor/products");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/dashboard/vendor/products"
            className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-3 w-3" />
            All products
          </Link>
          <h1 className="text-lg font-bold text-[var(--foreground)]">
            {mode === "create" ? "Add product" : title || "Edit product"}
          </h1>
          <p className="text-[11px] text-[var(--foreground-muted)]">
            {mode === "create"
              ? "Save it as a draft to finish later, or publish it now."
              : `Editing ${product?.slug || "this product"}`}
          </p>
        </div>

        {mode === "edit" && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${statusStyle.badge}`}
          >
            <StatusIcon className="h-3 w-3" />
            {statusStyle.label}
          </span>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-4">
          <Section title="Basics" icon={Sparkles}>
            <Field label="Title">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Brand">
                <input value={brand} onChange={(event) => setBrand(event.target.value)} className={inputClass} />
              </Field>
              <Field label="SKU">
                <input value={sku} onChange={(event) => setSku(event.target.value)} className={inputClass} />
              </Field>
            </div>

            <Field label="Category">
              <select
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setSelectedSubs([]);
                }}
                className={inputClass}
              >
                <option value="">Choose a category</option>
                {categories.map((category) => (
                  <option key={category._id || category.id} value={category._id || category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            {visibleSubs.length > 0 && (
              <div>
                <label className={labelClass}>Subcategories</label>
                <div className="flex flex-wrap gap-1.5">
                  {visibleSubs.map((sub) => {
                    const id = sub._id || sub.id || "";
                    const active = selectedSubs.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setSelectedSubs((prev) =>
                            active ? prev.filter((value) => value !== id) : [...prev, id]
                          )
                        }
                        className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                          active
                            ? "border-transparent bg-brand-gradient text-[var(--on-grad-text)]"
                            : "border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]"
                        }`}
                      >
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <Field label="Description">
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={5}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-3 py-2 text-[11px] leading-relaxed text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]/70 focus:outline-none focus:ring-2 focus:ring-[var(--brand-flat)]/35"
              />
            </Field>
          </Section>

          <Section title="Pricing and stock" icon={Check}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Price" hint={price ? formatTaka(Number(price)) : undefined}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Compare-at price" hint="The crossed-out original price.">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={originalPrice}
                  onChange={(event) => setOriginalPrice(event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Stock quantity" hint="Leave empty when the product is not stock-tracked.">
              <input
                type="number"
                min="0"
                step="1"
                value={stockQuantity}
                onChange={(event) => setStockQuantity(event.target.value)}
                className={inputClass}
              />
            </Field>
          </Section>

          <Section title="Media" icon={ImagePlus}>
            <ImageUploader label="Main image" value={image} onChange={setImage} required />

            <div>
              <label className={labelClass}>Gallery ({gallery.length})</label>
              {gallery.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {gallery.map((url) => (
                    <div
                      key={url}
                      className="group relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--border-color)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Gallery item" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setGallery((prev) => prev.filter((item) => item !== url))}
                        className="absolute right-1 top-1 rounded-md bg-black/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                        aria-label="Remove image"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <ImageUploader
                label="Add a gallery image"
                value=""
                onChange={(url) => {
                  if (url) setGallery((prev) => (prev.includes(url) ? prev : [...prev, url]));
                }}
              />
            </div>
          </Section>

          <Section title="Specifications" icon={Check}>
            <div className="space-y-2">
              {specs.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={row.key}
                    onChange={(event) =>
                      setSpecs((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, key: event.target.value } : item))
                      )
                    }
                    placeholder="Name (e.g. Material)"
                    className={inputClass}
                  />
                  <input
                    value={row.value}
                    onChange={(event) =>
                      setSpecs((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, value: event.target.value } : item))
                      )
                    }
                    placeholder="Value"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setSpecs((prev) => prev.filter((_, i) => i !== index))}
                    className="shrink-0 rounded-lg p-2 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-rose-500 cursor-pointer"
                    aria-label="Remove specification"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSpecs((prev) => [...prev, { key: "", value: "" }])}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Add row
            </button>
          </Section>

          <Section title="Variants" icon={Plus}>
            <p className="text-[10px] text-[var(--foreground-muted)]">
              Optional labels such as Colour or Size. Pricing stays on the product row.
            </p>

            <div className="space-y-2">
              {variants.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    value={row.name}
                    onChange={(event) =>
                      setVariants((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, name: event.target.value } : item))
                      )
                    }
                    placeholder="Colour"
                    className={inputClass}
                  />
                  <input
                    value={row.values}
                    onChange={(event) =>
                      setVariants((prev) =>
                        prev.map((item, i) => (i === index ? { ...item, values: event.target.value } : item))
                      )
                    }
                    placeholder="Red, Blue, Green"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== index))}
                    className="shrink-0 rounded-lg p-2 text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-alt)] hover:text-rose-500 cursor-pointer"
                    aria-label="Remove variant"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setVariants((prev) => [...prev, { name: "", values: "" }])}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-2.5 py-1.5 text-[10px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              Add option
            </button>
          </Section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-4">
          <Section title="Shipping" icon={Truck}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Weight (kg)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shipping.weightKg ?? ""}
                  onChange={(event) =>
                    setShipping((prev) => ({
                      ...prev,
                      weightKg: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                  className={inputClass}
                />
              </Field>
              <Field label="Delivery days">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={shipping.deliveryDays ?? ""}
                  onChange={(event) =>
                    setShipping((prev) => ({
                      ...prev,
                      deliveryDays: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                  className={inputClass}
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-[11px] font-medium text-[var(--foreground)]">
              <input
                type="checkbox"
                checked={Boolean(shipping.freeShipping)}
                onChange={(event) => setShipping((prev) => ({ ...prev, freeShipping: event.target.checked }))}
                className="h-3.5 w-3.5 accent-[var(--brand-flat)]"
              />
              Free shipping
            </label>

            <Field label="Shipping note">
              <input
                value={shipping.note ?? ""}
                onChange={(event) => setShipping((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Ships from Dhaka in 2 days"
                className={inputClass}
              />
            </Field>
          </Section>

          <Section title="Visibility" icon={Check}>
            <label className="flex items-start justify-between gap-3">
              <span>
                <span className="block text-[11px] font-bold text-[var(--foreground)]">Show in storefront</span>
                <span className="mt-0.5 block text-[10px] leading-relaxed text-[var(--foreground-muted)]">
                  Hidden products keep their link but leave the catalogue.
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={isVisible}
                onClick={() => setIsVisible((prev) => !prev)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors cursor-pointer ${
                  isVisible ? "bg-emerald-500" : "bg-[var(--border-color)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-xs transition-transform ${
                    isVisible ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>

            <p className="rounded-lg bg-[var(--surface-alt)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--foreground-muted)]">
              {plan.used} / {plan.maxProducts} products used on {plan.name}.
            </p>
          </Section>

          <div className="space-y-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 shadow-2xs">
            {mode === "create" ? (
              <>
                <button
                  type="button"
                  onClick={() => save("publish")}
                  disabled={saving !== null}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2.5 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {saving === "publish" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  Save and publish
                </button>
                <button
                  type="button"
                  onClick={() => save("draft")}
                  disabled={saving !== null}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2.5 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-60 cursor-pointer"
                >
                  {saving === "draft" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save as draft
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => save("save")}
                  disabled={saving !== null}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-gradient px-3 py-2.5 text-[11px] font-bold text-[var(--on-grad-text)] shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  {saving === "save" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  Save changes
                </button>

                {product?.vendorProductStatus !== "published" && (
                  <button
                    type="button"
                    onClick={() => save("publish")}
                    disabled={saving !== null}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2.5 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-60 cursor-pointer"
                  >
                    {saving === "publish" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Publish
                  </button>
                )}

                {product?.vendorProductStatus === "published" && (
                  <button
                    type="button"
                    onClick={() => save("draft")}
                    disabled={saving !== null}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border-color)] px-3 py-2.5 text-[11px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-alt)] disabled:opacity-60 cursor-pointer"
                  >
                    {saving === "draft" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                    Unpublish
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
