"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Card,
  Input,
  Button,
  Select,
  ListBox,
  Switch,
  Modal,
} from "@heroui/react";
import {
  SlidersHorizontal,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Calendar as CalendarIcon,
  Clock,
  Package,
  ArrowRight,
  ExternalLink,
  Check,
  Timer,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import { Product, SlideItem } from "@/types";
import { addSlide, updateSlide, deleteSlide } from "@/lib/action/slides";
import { hasOfferDiscount } from "@/lib/offer";
import HeroUIDateTimePicker from "@/components/shared/HeroUIDateTimePicker";
import { useSiteSettings } from "@/context/SiteSettingsContext";

interface HomeSliderClientProps {
  initialSlides: SlideItem[];
  products: Product[];
}

const FALLBACK_IMAGE =
  "https://i.ibb.co.com/Q3Tpt7Df/industries-consumer-electronics-removebg-preview.png";

// Helper to format ISO date for <input type="datetime-local">
function formatDateForInput(dateVal?: string | Date): string {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

// Helper to format display date
function formatDisplayDate(dateVal?: string | Date): string {
  if (!dateVal) return "No countdown set";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "Invalid date";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Helper to calculate countdown time remaining string
function getTimeRemaining(dateVal?: string | Date) {
  if (!dateVal) return { text: "No timer set", expired: false, hours: 0, mins: 0, secs: 0 };
  const d = new Date(dateVal);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) {
    return { text: "Offer Ended (Standard Price)", expired: true, hours: 0, mins: 0, secs: 0 };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  const secs = Math.floor((diff / 1000) % 60);
  return {
    text: `${hours}h ${mins}m left`,
    expired: false,
    hours,
    mins,
    secs,
  };
}

export default function HomeSliderClient({
  initialSlides = [],
  products = [],
}: HomeSliderClientProps) {
  const { formatPrice, currencySymbol } = useSiteSettings();
  const router = useRouter();

  const [slides, setSlides] = useState<SlideItem[]>(
    Array.isArray(initialSlides) ? initialSlides : []
  );

  useEffect(() => {
    setSlides(Array.isArray(initialSlides) ? initialSlides : []);
  }, [initialSlides]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [previewSlide, setPreviewSlide] = useState<SlideItem | null>(null);

  // Add / Edit Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState<{
    productId: string;
    tabTitle: string;
    subtitle: string;
    tagline: string;
    targetDate: string;
    order: number;
    isActive: boolean;
  }>({
    productId: "",
    tabTitle: "",
    subtitle: "",
    tagline: "",
    targetDate: "",
    order: 0,
    isActive: true,
  });

  // Delete Modal State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [slideToDelete, setSlideToDelete] = useState<SlideItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats
  const totalSlides = slides.length;
  const activeSlides = slides.filter((s) => s.isActive !== false).length;
  const inactiveSlides = slides.filter((s) => s.isActive === false).length;

  // Selected product lookup
  const selectedProduct = useMemo(() => {
    if (!formData.productId) return null;
    return products.find(
      (p) => String(p.id || (p as any)._id) === String(formData.productId)
    ) || null;
  }, [formData.productId, products]);

  // The slide shows the linked product's prices, so a countdown only makes sense
  // when that product actually has a lower selling price than its original one.
  const hasProductDiscount = hasOfferDiscount(
    selectedProduct?.price,
    selectedProduct?.originalPrice
  );

  // Filtered Slides
  const filteredSlides = useMemo(() => {
    return slides.filter((slide) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? slide.isActive !== false : slide.isActive === false);

      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesStatus;

      const tabMatch = slide.tabTitle?.toLowerCase().includes(q);
      const subMatch = slide.subtitle?.toLowerCase().includes(q);
      const tagMatch = slide.tagline?.toLowerCase().includes(q);
      const prodMatch = slide.productName?.toLowerCase().includes(q);

      return (tabMatch || subMatch || tagMatch || prodMatch) && matchesStatus;
    });
  }, [slides, searchQuery, statusFilter]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingSlideId(null);
    const firstProd = products[0];
    const firstProdId = firstProd ? String(firstProd.id || (firstProd as any)._id) : "";
    const defaultDate = firstProd?.offerEndDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setFormData({
      productId: firstProdId,
      tabTitle: firstProd?.title ? firstProd.title.toUpperCase().slice(0, 30) : "",
      subtitle: "LIMITED WEEK DEAL",
      tagline: "HURRY UP BEFORE OFFER WILL END",
      targetDate: formatDateForInput(defaultDate),
      order: slides.length,
      isActive: true,
    });
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (slide: SlideItem) => {
    setEditingSlideId(slide.id || slide._id || "");
    const prod = products.find((p) => String(p.id || (p as any)._id) === String(slide.productId));
    const effectiveDate = slide.targetDate || prod?.offerEndDate;
    setFormData({
      productId: slide.productId || "",
      tabTitle: slide.tabTitle || "",
      subtitle: slide.subtitle || "",
      tagline: slide.tagline || "",
      targetDate: effectiveDate ? new Date(effectiveDate).toISOString() : "",
      order: slide.order ?? 0,
      isActive: slide.isActive !== false,
    });
    setIsFormModalOpen(true);
  };

  // Preset countdown durations
  const handleSetPresetDays = (days: number) => {
    const target = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setFormData((prev) => ({ ...prev, targetDate: formatDateForInput(target) }));
  };

  // Submit Add/Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productId) {
      toast.error("Please select a target product for this slide");
      return;
    }
    if (!formData.tabTitle.trim()) {
      toast.error("Tab title is required");
      return;
    }
    if (!formData.subtitle.trim()) {
      toast.error("Subtitle is required");
      return;
    }
    if (!formData.tagline.trim()) {
      toast.error("Tagline is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        productId: formData.productId,
        tabTitle: formData.tabTitle.trim(),
        subtitle: formData.subtitle.trim(),
        tagline: formData.tagline.trim(),
        targetDate:
          hasProductDiscount && formData.targetDate
            ? new Date(formData.targetDate).toISOString()
            : undefined,
        order: Number(formData.order) || 0,
        isActive: formData.isActive,
      };

      if (editingSlideId) {
        const res = await updateSlide(editingSlideId, payload);
        if (res?.success !== false) {
          toast.success("Hero slide and linked product countdown updated!");
          const isExpired = formData.targetDate && new Date(formData.targetDate).getTime() <= Date.now();
          const effectivePrice = isExpired && selectedProduct?.originalPrice
            ? selectedProduct.originalPrice
            : (selectedProduct?.price ?? 0);

          const updatedSlide: SlideItem = res?.data || {
            ...slides.find((s) => (s.id || s._id) === editingSlideId),
            ...payload,
            productName: selectedProduct?.title || "",
            image: selectedProduct?.image || "",
            price: effectivePrice,
            originalPrice: selectedProduct?.originalPrice,
            targetDate: formData.targetDate ? new Date(formData.targetDate) : undefined,
          };
          setSlides((prev) =>
            prev.map((s) =>
              (s.id || s._id) === editingSlideId ? updatedSlide : s
            )
          );
          setIsFormModalOpen(false);
          router.refresh();
        } else {
          toast.error(res?.message || "Failed to update slide");
        }
      } else {
        const res = await addSlide(payload);
        if (res?.success !== false) {
          toast.success("New hero slide created and product countdown synchronized!");
          if (res?.data) {
            setSlides((prev) => [res.data, ...prev]);
          }
          setIsFormModalOpen(false);
          router.refresh();
        } else {
          toast.error(res?.message || "Failed to create slide");
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active status directly from table
  const handleToggleActive = async (slide: SlideItem, newStatus: boolean) => {
    const id = slide.id || slide._id;
    if (!id) return;

    try {
      const res = await updateSlide(id, { isActive: newStatus });
      if (res?.success !== false) {
        toast.success(newStatus ? "Slide activated!" : "Slide deactivated!");
        setSlides((prev) =>
          prev.map((s) =>
            (s.id || s._id) === id ? { ...s, isActive: newStatus } : s
          )
        );
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  // Delete Action
  const handleOpenDelete = (slide: SlideItem) => {
    setSlideToDelete(slide);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!slideToDelete) return;
    const id = slideToDelete.id || slideToDelete._id;
    if (!id) return;

    setIsDeleting(true);
    try {
      const res = await deleteSlide(id);
      if (res?.success !== false) {
        toast.success("Slide deleted successfully!");
        setSlides((prev) => prev.filter((s) => (s.id || s._id) !== id));
        setIsDeleteOpen(false);
        setSlideToDelete(null);
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to delete slide");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error deleting slide");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link href="/dashboard/admin" className="hover:text-primary transition-colors">
              Admin Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary">Home Slider</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)] flex items-center gap-2.5">
            Hero Slider{" "}
            <span className="text-primary">
              Controller
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Configure, reorder, and activate hero slides with synchronized product countdowns.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onPress={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Slide</span>
          </Button>
        </div>
      </div>

      {/* ── Stats Summary Badges ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--foreground-muted)]">Total Slides</p>
            <p className="text-xl font-extrabold text-[var(--foreground)]">{totalSlides}</p>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--foreground-muted)]">Active On Homepage</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeSlides}</p>
          </div>
        </Card>

        <Card className="p-4 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--foreground-muted)]">Draft / Inactive</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{inactiveSlides}</p>
          </div>
        </Card>
      </div>

      {/* ── Toolbar: Search & Filter ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search bar — full line on a phone, fixed desk width from `sm`. A
              `min-w` floor cannot be shrunk away and used to push this row past
              the edge of a small screen. */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] z-10" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tab title, product, tagline..."
              className="w-full pl-9 pr-4 h-10 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
            />
          </div>

          {/* Status filter buttons */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)]">
            {(["all", "active", "inactive"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-primary text-white shadow-xs"
                    : "text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:text-[var(--foreground)] dark:hover:text-[var(--foreground)]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--foreground)] hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--surface)] text-xs font-semibold transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>View Live Home Slider</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>
        </div>
      </div>

      {/* ── Slides Table ── */}
      {filteredSlides.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <SlidersHorizontal className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              No hero slides found
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {searchQuery
                ? "Try adjusting your search query or status filter."
                : "Get started by adding your first hero deal slide."}
            </p>
          </div>
          <Button
            onPress={handleOpenCreate}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Slide</span>
          </Button>
        </Card>
      ) : (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xs p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--surface-alt)]/80 dark:bg-[var(--surface-alt)]/40 text-[11px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">
                  <th className="py-3.5 px-4 w-14 text-center">Order</th>
                  <th className="py-3.5 px-4">Tab Title & Tagline</th>
                  <th className="py-3.5 px-4">Linked Product</th>
                  <th className="py-3.5 px-4">Headline / Subtitle</th>
                  <th className="py-3.5 px-4">Countdown End Date</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {filteredSlides.map((slide, index) => {
                  const sId = (slide.id || slide._id) as string;
                  const timer = getTimeRemaining(slide.targetDate);
                  const priceStr =
                    typeof slide.price === "number"
                      ? formatPrice(slide.price)
                      : slide.price || `${currencySymbol}0.00`;
                  const origPriceStr =
                    typeof slide.originalPrice === "number"
                      ? formatPrice(slide.originalPrice)
                      : slide.originalPrice;

                  return (
                    <tr
                      key={sId || index}
                      className="hover:bg-[var(--surface-alt)]/70 dark:hover:bg-[var(--surface)]/30 transition-colors bg-[var(--surface-elevated)]"
                    >
                      {/* Order */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[var(--surface-alt)] font-bold text-[var(--foreground)] font-mono text-xs">
                          {slide.order ?? index + 1}
                        </span>
                      </td>

                      {/* Tab Title & Tagline */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        <div>
                          <p className="font-bold text-[var(--foreground)] uppercase tracking-tight text-xs">
                            {slide.tabTitle}
                          </p>
                          <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5 line-clamp-1">
                            {slide.tagline}
                          </p>
                        </div>
                      </td>

                      {/* Linked Product */}
                      <td className="py-3.5 px-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] flex items-center justify-center shrink-0 overflow-hidden">
                            {slide.image ? (
                              <Image
                                src={slide.image}
                                alt={slide.productName || "Product"}
                                fill
                                sizes="48px"
                                className="object-contain p-1"
                                unoptimized
                              />
                            ) : (
                              <Package className="w-5 h-5 text-[var(--foreground-muted)]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-[var(--foreground)] line-clamp-1">
                              {slide.productName || "Unnamed Product"}
                            </p>
                            <div className="flex items-baseline gap-2 mt-0.5">
                              <span className="font-bold text-red-500 dark:text-red-400 text-xs">
                                {priceStr}
                              </span>
                              {origPriceStr && (
                                <span className="text-[10px] text-[var(--foreground-muted)] line-through">
                                  {origPriceStr}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Headline / Subtitle */}
                      <td className="py-3.5 px-4 max-w-xs font-semibold text-[var(--foreground)]">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--surface-alt)] text-[11px] text-[var(--foreground)] font-mono">
                          {slide.subtitle}
                        </span>
                      </td>

                      {/* Target Date (From Linked Product) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-medium text-[var(--foreground)] text-xs flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-[var(--foreground-muted)]" />
                            {formatDisplayDate(slide.targetDate)}
                          </span>
                          <span
                            className={`text-[10px] font-bold mt-0.5 ${
                              timer.expired
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {timer.text}
                          </span>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Switch
                            isSelected={slide.isActive !== false}
                            onChange={(val) => handleToggleActive(slide, val)}
                            className="cursor-pointer"
                          >
                            <Switch.Content className="cursor-pointer">
                              <Switch.Control className="cursor-pointer">
                                <Switch.Thumb className="cursor-pointer" />
                              </Switch.Control>
                            </Switch.Content>
                          </Switch>
                          <span
                            className={`text-[10px] font-bold uppercase ${
                              slide.isActive !== false
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-[var(--foreground-muted)]"
                            }`}
                          >
                            {slide.isActive !== false ? "Active" : "Off"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setPreviewSlide(slide)}
                            className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-primary hover:bg-primary/10 dark:hover:bg-[var(--accent)]/10 transition-colors cursor-pointer"
                            title="Preview Hero Banner"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(slide)}
                            className="p-1.5 rounded-lg text-primary hover:bg-primary/10 dark:hover:bg-[var(--accent)]/10 transition-colors cursor-pointer"
                            title="Edit Slide"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(slide)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete Slide"
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
        </Card>
      )}

      {/* ════════════════════════════════════════════════════════
          ADD / EDIT SLIDE MODAL (HeroUI v3 Modal)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isFormModalOpen} onOpenChange={setIsFormModalOpen}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
              <Modal.Header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                <Modal.Heading className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-primary" />
                  {editingSlideId ? "Edit Hero Slide" : "Create New Hero Slide"}
                </Modal.Heading>
                <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg">
                  ✕
                </Modal.CloseTrigger>
              </Modal.Header>

              <Modal.Body>
                <form onSubmit={handleSubmitForm} id="slide-form" className="space-y-5">
                  {/* Select Product */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[var(--foreground)]">
                      Select Linked Product <span className="text-rose-500">*</span>
                    </label>
                    <Select
                      selectedKey={formData.productId || null}
                      onSelectionChange={(key) => {
                        const pId = String(key);
                        const prod = products.find((p) => String(p.id || (p as any)._id) === pId);
                        setFormData((prev) => ({
                          ...prev,
                          productId: pId,
                          tabTitle: prev.tabTitle || prod?.title || "",
                          targetDate: prod?.offerEndDate ? new Date(prod.offerEndDate).toISOString() : prev.targetDate,
                        }));
                      }}
                      placeholder="Choose product from catalog"
                      isRequired
                    >
                      <Select.Trigger className="w-full cursor-pointer bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl">
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover className="max-h-60 overflow-y-auto">
                        <ListBox>
                          {products.map((prod) => {
                            const pId = String(prod.id || (prod as any)._id);
                            return (
                              <ListBox.Item
                                key={pId}
                                id={pId}
                                textValue={prod.title}
                                className="cursor-pointer py-2"
                              >
                                <div className="flex items-center justify-between w-full gap-2">
                                  <span className="font-medium text-xs truncate max-w-[300px]">
                                    {prod.title}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                                    {formatPrice(Number(prod.price || 0))}
                                  </span>
                                </div>
                              </ListBox.Item>
                            );
                          })}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>

                  {/* Selected Product Live Sync Info Banner */}
                  {selectedProduct && (
                    <div className="p-4 bg-[var(--accent)]/10 dark:bg-[var(--accent)]/10 border border-[var(--border-color)] rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] flex items-center justify-center shrink-0 overflow-hidden">
                          {selectedProduct.image ? (
                            <Image
                              src={selectedProduct.image}
                              alt={selectedProduct.title}
                              fill
                              sizes="48px"
                              className="object-contain p-1"
                              unoptimized
                            />
                          ) : (
                            <Package className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[var(--foreground)] truncate">
                            {selectedProduct.title}
                          </p>
                          <p className="text-[11px] text-[var(--foreground-muted)]">
                            Deal Price:{" "}
                            <span className="font-bold text-red-500">
                              {formatPrice(Number(selectedProduct.price || 0))}
                            </span>
                            {selectedProduct.originalPrice && hasProductDiscount && (
                              <span className="ml-1.5 text-[10px] text-[var(--foreground-muted)] line-through">
                                {formatPrice(Number(selectedProduct.originalPrice))}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Countdown End Date (Updates real product & slide) ── */}
                  {hasProductDiscount ? (
                    <HeroUIDateTimePicker
                      label="Countdown End Date & Time"
                      value={formData.targetDate}
                      onChange={(isoString) =>
                        setFormData((prev) => ({
                          ...prev,
                          targetDate: isoString,
                        }))
                      }
                      helperText="⚡ Setting this countdown updates the real product deal timer across the entire website."
                    />
                  ) : (
                    <p className="text-[11px] text-[var(--foreground-muted)] bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                      {selectedProduct
                        ? "This product has no discount, so the slide shows no countdown. Set an original price higher than the selling price on the product to run a deal."
                        : "Pick a product first. A countdown appears only when the product sells for less than its original price."}
                    </p>
                  )}

                  {/* Tab Title & Subtitle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Tab Bottom Label <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={formData.tabTitle}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, tabTitle: e.target.value }))
                        }
                        placeholder="e.g. SO MUCH TO EXPLORE IN OUR STORE"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                        required
                      />
                      <span className="text-[10px] text-[var(--foreground-muted)]">
                        Label on the bottom navigation tab
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[var(--foreground)]">
                        Big Headline / Subtitle <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        value={formData.subtitle}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, subtitle: e.target.value }))
                        }
                        placeholder="e.g. LIMITED WEEK DEAL"
                        className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                        required
                      />
                      <span className="text-[10px] text-[var(--foreground-muted)]">
                        Rendered on the left side in large bold text
                      </span>
                    </div>
                  </div>

                  {/* Tagline */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--foreground)]">
                      Tagline / Callout <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      value={formData.tagline}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                      }
                      placeholder="e.g. HURRY UP BEFORE OFFER WILL END"
                      className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs"
                      required
                    />
                  </div>

                  {/* Display Order */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[var(--foreground)]">
                      Display Order / Position
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={String(formData.order)}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          order: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="0"
                      className="w-full bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl text-xs font-mono"
                    />
                  </div>

                  {/* Status Toggle Switch */}
                  <div className="flex items-center justify-between p-3.5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-color)]/60">
                    <div>
                      <p className="text-xs font-bold text-[var(--foreground)]">
                        Active on Homepage
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        When enabled, this slide appears in the hero tab rotation.
                      </p>
                    </div>
                    <Switch
                      isSelected={formData.isActive}
                      onChange={(val) =>
                        setFormData((prev) => ({ ...prev, isActive: val }))
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
                </form>
              </Modal.Body>

              <Modal.Footer className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                <Button
                  variant="outline"
                  onPress={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-[var(--border-color)] text-[var(--foreground)]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="slide-form"
                  isDisabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-xs cursor-pointer hover:opacity-95 transition-all"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting
                    ? "Saving..."
                    : editingSlideId
                    ? "Update Slide"
                    : "Create Slide"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          LIVE BANNER PREVIEW MODAL (HeroUI v3 Modal)
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={!!previewSlide} onOpenChange={(open) => !open && setPreviewSlide(null)}>
        <Modal.Backdrop>
          <Modal.Container size="lg">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-6 text-[var(--foreground)]">
              <Modal.Header className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <Modal.Heading className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary" />
                  Live Hero Slider Preview
                </Modal.Heading>
                <Modal.CloseTrigger className="text-[var(--foreground-muted)] hover:text-[var(--foreground)] cursor-pointer p-1 rounded-lg">
                  ✕
                </Modal.CloseTrigger>
              </Modal.Header>

              <Modal.Body>
                {previewSlide && (
                  <div className="relative bg-gradient-to-b from-[var(--surface-alt)] to-[var(--surface-elevated)] dark:from-[var(--surface-elevated)] dark:to-[var(--surface-alt)] rounded-2xl overflow-hidden border border-[var(--border-color)] p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-6">
                      {/* Left */}
                      <div className="md:col-span-5 space-y-2 text-center md:text-left">
                        <h3 className="text-2xl md:text-3xl font-light text-[var(--foreground)] dark:text-[var(--foreground)] uppercase leading-tight">
                          {previewSlide.subtitle.split(" ")[0]} <br />
                          <span className="font-bold">
                            {previewSlide.subtitle.split(" ").slice(1).join(" ")}
                          </span>
                        </h3>
                        <p className="text-[11px] font-semibold text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] uppercase tracking-wide">
                          {previewSlide.tagline}
                        </p>
                        <div className="pt-2">
                          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-xs font-bold">
                            Shop Now <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>

                      {/* Center */}
                      <div className="md:col-span-4 flex justify-center items-center h-48">
                        <img
                          src={previewSlide.image || FALLBACK_IMAGE}
                          alt={previewSlide.productName || "Slide Product"}
                          className="max-h-full object-contain drop-shadow-md"
                        />
                      </div>

                      {/* Right */}
                      <div className="md:col-span-3 space-y-3 text-center md:text-left">
                        <h4 className="text-sm font-bold text-primary line-clamp-2">
                          {previewSlide.productName}
                        </h4>
                        <div className="text-2xl font-normal text-red-500 dark:text-red-400">
                          {typeof previewSlide.price === "number"
                            ? formatPrice(previewSlide.price)
                            : previewSlide.price && !isNaN(Number(previewSlide.price))
                            ? formatPrice(Number(previewSlide.price))
                            : formatPrice(0)}
                        </div>
                        <div className="text-[10px] text-[var(--foreground-muted)] uppercase font-semibold">
                          Countdown End: {formatDisplayDate(previewSlide.targetDate)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-3 border-t border-[var(--border-color)] text-center">
                      <span className="text-xs font-bold uppercase text-[var(--foreground)]">
                        Tab Label: &ldquo;{previewSlide.tabTitle}&rdquo;
                      </span>
                    </div>
                  </div>
                )}
              </Modal.Body>

              <Modal.Footer className="flex items-center justify-end">
                <Button
                  variant="outline"
                  onPress={() => setPreviewSlide(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-[var(--border-color)]"
                >
                  Close Preview
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
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/40">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-bold text-[var(--foreground)]">
                  Delete Hero Slide?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Are you sure you want to delete the slide{" "}
                  <span className="font-bold text-[var(--foreground)]">
                    &ldquo;{slideToDelete?.tabTitle}&rdquo;
                  </span>
                  ? This will remove it immediately from your homepage slider.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  onPress={() => setIsDeleteOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer border border-[var(--border-color)] text-[var(--foreground)]"
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
