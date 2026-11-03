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
  Star,
  Search,
  RotateCcw,
  Trash2,
  ExternalLink,
  Eye,
  Calendar,
  User,
  ShoppingBag,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Images,
  Maximize2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { deleteReview } from "@/lib/action/reviews";
import ImageGalleryModal from "@/components/shared/ImageGalleryModal";
import UserAvatar from "@/components/shared/UserAvatar";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const RATING_FILTER_TABS = ["All", "5 Stars", "4 Stars", "3 Stars", "2 Stars", "1 Star"];

const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "rating_high", label: "Highest Rating" },
  { key: "rating_low", label: "Lowest Rating" },
];

interface ReviewItem {
  id: string;
  _id?: string;
  productId: string;
  productTitle?: string;
  productSlug?: string;
  productImage?: string;
  productPrice?: number;
  userId: string;
  userName?: string;
  userAvatar?: string;
  userEmail?: string;
  rating: number;
  comment: string;
  images?: string[];
  date?: string;
  createdAt?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ReviewsClientProps {
  initialReviews: ReviewItem[];
  pagination: PaginationMeta;
}

export default function ReviewsClient({
  initialReviews = [],
  pagination,
}: ReviewsClientProps) {
  const { formatPrice } = useSiteSettings();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<ReviewItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // Review image gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  useEffect(() => {
    setReviews(Array.isArray(initialReviews) ? initialReviews : []);
  }, [initialReviews]);

  const currentRatingParam = searchParams.get("rating") || "All";
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
        if (val === undefined || val === "" || (key === "rating" && val.toLowerCase() === "all")) {
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
        router.push(`/dashboard/admin/reviews${qs ? `?${qs}` : ""}`, { scroll: false });
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
      router.push("/dashboard/admin/reviews", { scroll: false });
    });
  };

  const promptDelete = (review: ReviewItem) => {
    setReviewToDelete(review);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;
    const reviewId = reviewToDelete.id || reviewToDelete._id;
    if (!reviewId) return;

    setIsDeleting(true);
    try {
      const res = await deleteReview(reviewId);
      if (res?.success !== false) {
        toast.success("Review deleted successfully");
        setReviews((prev) => prev.filter((r) => (r.id || r._id) !== reviewId));
        if (selectedReview && (selectedReview.id || selectedReview._id) === reviewId) {
          setIsModalOpen(false);
          setSelectedReview(null);
        }
        setIsDeleteModalOpen(false);
        setReviewToDelete(null);
        router.refresh();
      } else {
        toast.error(res?.message || "Failed to delete review");
      }
    } catch {
      toast.error("Error deleting review");
    } finally {
      setIsDeleting(false);
    }
  };

  const openReviewModal = (review: ReviewItem) => {
    setSelectedReview(review);
    setIsModalOpen(true);
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3.5 h-3.5 ${
              star <= rating
                ? "text-amber-400 fill-amber-400"
                : "text-[var(--border-color)] dark:text-[var(--foreground-secondary)]"
            }`}
          />
        ))}
      </div>
    );
  };

  const { page, limit, total, totalPages } = pagination || {
    page: 1,
    limit: 10,
    total: reviews.length,
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
            <span className="text-primary">Reviews</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Product{" "}
            <span className="text-primary">
              Reviews
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Manage and inspect user feedback, ratings, and testimonials across the store.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary">
            Total Reviews: <span className="font-extrabold text-primary">{total}</span>
          </div>
        </div>
      </div>

      {/* ── Filters & Search Bar ── */}
      <div className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
        {/* Rating Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-[var(--border-color)] pb-3">
          <span className="text-[11px] font-bold text-[var(--foreground-muted)] uppercase tracking-wider mr-1">
            Rating:
          </span>
          {RATING_FILTER_TABS.map((tab) => {
            const rawRating = tab === "All" ? "All" : tab.replace(" Stars", "").replace(" Star", "");
            const isActive = currentRatingParam === rawRating;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => updateParams({ rating: rawRating === "All" ? undefined : rawRating })}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-primary text-white shadow-xs font-bold"
                    : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]/80 hover:text-[var(--foreground)] border border-[var(--border-color)]"
                }`}
              >
                {rawRating !== "All" && <Star className={`w-3 h-3 ${isActive ? "fill-white" : "fill-amber-400 text-amber-400"}`} />}
                <span>{tab}</span>
              </button>
            );
          })}
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
                placeholder="Search reviews or products..."
                className="w-full pl-9 pr-4 h-10 bg-[var(--surface-alt)] dark:bg-[var(--surface)] border border-[var(--border-color)] rounded-xl text-xs"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="h-10 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer shrink-0"
            >
              Search
            </Button>
          </form>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div className="w-48">
              <Select
                aria-label="Sort Reviews"
                selectedKey={currentSort}
                onSelectionChange={(key) => updateParams({ sort: key ? String(key) : "newest" })}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] dark:bg-[var(--surface)] text-xs font-semibold text-[var(--foreground-secondary)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-amber-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
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
                        className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-[var(--surface)] text-[var(--foreground)] cursor-pointer flex items-center justify-between"
                      >
                        {opt.label}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {(currentSearch || currentRatingParam !== "All" || currentSort !== "newest") && (
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

      {/* ── Reviews Table ── */}
      {isPending ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center shadow-xs">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-[var(--foreground-muted)]">Loading reviews...</p>
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-2xl p-12 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <Star className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              No reviews found
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              {currentSearch
                ? "No reviews matched your search criteria."
                : "There are currently no reviews matching the selected filter."}
            </p>
          </div>
          {(currentSearch || currentRatingParam !== "All") && (
            <Button
              onPress={handleResetFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
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
                  <th className="py-3.5 px-4">Product</th>
                  <th className="py-3.5 px-4">Reviewer</th>
                  <th className="py-3.5 px-4 text-center">Rating</th>
                  <th className="py-3.5 px-4">Comment</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]/60 text-xs">
                {reviews.map((rev) => {
                  const id = rev.id || rev._id || "";
                  const dateStr = rev.date || rev.createdAt
                    ? new Date(rev.date || rev.createdAt!).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";

                  return (
                    <tr
                      key={id}
                      onClick={() => openReviewModal(rev)}
                      className="hover:bg-[var(--surface-alt)]/80 dark:hover:bg-[var(--surface)]/40 transition-colors cursor-pointer group"
                    >
                      {/* Product */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-10 h-10 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] shrink-0 overflow-hidden flex items-center justify-center">
                            {rev.productImage ? (
                              <Image
                                src={rev.productImage}
                                alt={rev.productTitle || "Product"}
                                fill
                                sizes="40px"
                                className="object-contain p-1"
                                unoptimized
                              />
                            ) : (
                              <ShoppingBag className="w-5 h-5 text-[var(--foreground-muted)]" />
                            )}
                          </div>
                          <div className="min-w-0 max-w-[160px]">
                            <p className="font-bold text-[var(--foreground)] truncate group-hover:text-amber-600 transition-colors">
                              {rev.productTitle || "Product"}
                            </p>
                            {rev.productPrice !== undefined && rev.productPrice > 0 && (
                              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {formatPrice(rev.productPrice)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Reviewer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            src={rev.userAvatar}
                            name={rev.userName}
                            size={28}
                            className="rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white text-[10px]"
                          />
                          <div className="min-w-0 max-w-[130px]">
                            <p className="font-semibold text-[var(--foreground)] truncate">
                              {rev.userName || "Anonymous"}
                            </p>
                            {rev.userEmail && (
                              <p className="text-[10px] text-[var(--foreground-muted)] truncate">
                                {rev.userEmail}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/40">
                          {renderStars(rev.rating)}
                          <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300">
                            {rev.rating}
                          </span>
                        </div>
                      </td>

                      {/* Comment */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <p className="text-[var(--foreground-muted)] truncate font-normal">
                          {rev.comment}
                        </p>
                        {rev.images && rev.images.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Images className="w-3 h-3 text-primary" />
                            <span className="text-[10px] text-primary font-semibold">{rev.images.length} photo{rev.images.length > 1 ? "s" : ""}</span>
                          </div>
                        )}
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
                            onPress={() => openReviewModal(rev)}
                            className="w-8 h-8 rounded-lg text-[var(--foreground-muted)] hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                            aria-label="View Review Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="ghost"
                            onPress={() => promptDelete(rev)}
                            className="w-8 h-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                            aria-label="Delete Review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <div className="p-4 border-t border-[var(--border-color)] bg-[var(--surface-alt)]/50 dark:bg-[var(--surface)]/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-[var(--foreground-muted)]">
              Showing{" "}
              <span className="font-bold text-[var(--foreground)]">
                {startItem}–{endItem}
              </span>{" "}
              of{" "}
              <span className="font-bold text-[var(--foreground)]">{total}</span> reviews
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
                            ? "bg-amber-500 text-white shadow-xs"
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

      {/* ── Review Details Modal ── */}
      <Modal
        isOpen={isModalOpen && !isGalleryOpen}
        onOpenChange={setIsModalOpen}
      >
        <Modal.Backdrop
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <Modal.Container size="md">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90dvh] overflow-y-auto text-[var(--foreground)]">
              {selectedReview && (
                <>
                  {/* Modal Header */}
                  <Modal.Header className="flex items-center justify-between border-b border-[var(--border-color)] pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 flex items-center justify-center">
                        <Star className="w-5 h-5 fill-amber-500" />
                      </div>
                      <div>
                        <Modal.Heading className="text-base font-bold text-[var(--foreground)]">
                          Review Details
                        </Modal.Heading>
                        <p className="text-xs text-[var(--foreground-muted)]">
                          ID: {selectedReview.id || selectedReview._id}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsModalOpen(false);
                      }}
                      aria-label="Close modal"
                      className="p-1.5 rounded-xl text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] active:scale-95 transition-all cursor-pointer touch-manipulation"
                    >
                      <X className="w-5 h-5 pointer-events-none" />
                    </button>
                  </Modal.Header>

                  {/* Modal Body */}
                  <Modal.Body className="space-y-6">
                    {/* Product Info Card */}
                    <div className="p-3.5 rounded-2xl bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)]/60 border border-[var(--border-color)]/40 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-12 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shrink-0 overflow-hidden flex items-center justify-center">
                          {selectedReview.productImage ? (
                            <Image
                              src={selectedReview.productImage}
                              alt={selectedReview.productTitle || "Product"}
                              fill
                              sizes="48px"
                              className="object-contain p-1"
                              unoptimized
                            />
                          ) : (
                            <ShoppingBag className="w-6 h-6 text-[var(--foreground-muted)]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[var(--foreground)] truncate">
                            {selectedReview.productTitle || "Product"}
                          </p>
                          {selectedReview.productPrice !== undefined && selectedReview.productPrice > 0 && (
                            <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                              {formatPrice(selectedReview.productPrice)}
                            </p>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/shop/${selectedReview.productSlug || selectedReview.productId}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
                      >
                        <span>View Product</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Reviewer Details */}
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-[var(--surface-alt)]">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          src={selectedReview.userAvatar}
                          name={selectedReview.userName}
                          size={36}
                          className="rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white text-xs"
                        />
                        <div>
                          <p className="text-xs font-bold text-[var(--foreground)]">
                            {selectedReview.userName || "Anonymous"}
                          </p>
                          <p className="text-[11px] text-[var(--foreground-muted)]">
                            {selectedReview.userEmail || "No email available"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {renderStars(selectedReview.rating)}
                          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 ml-1">
                            {selectedReview.rating}/5
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--foreground-muted)] mt-0.5">
                          {selectedReview.date || selectedReview.createdAt
                            ? new Date(selectedReview.date || selectedReview.createdAt!).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : ""}
                        </p>
                      </div>
                    </div>

                    {/* Review Comment */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                        <MessageSquare className="w-4 h-4 text-amber-500" />
                        <span>Review Comment:</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)]/60 border border-[var(--border-color)]/80 dark:border-[var(--border-color)] text-xs leading-relaxed text-[var(--foreground)] italic">
                        "{selectedReview.comment}"
                      </div>
                    </div>

                    {/* Review Images */}
                    {selectedReview.images && selectedReview.images.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                          <Images className="w-4 h-4 text-primary" />
                          <span>Review Photos ({selectedReview.images.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedReview.images.map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGalleryImages(selectedReview.images!);
                                setGalleryIndex(idx);
                                setIsGalleryOpen(true);
                              }}
                              className="relative w-16 h-16 rounded-xl overflow-hidden border border-[var(--border-color)] hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer group touch-manipulation active:scale-95"
                            >
                              <img src={img} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                                <Maximize2 className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </Modal.Body>

                  {/* Modal Footer Actions */}
                  <Modal.Footer className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border-color)]">
                    <Button
                      size="sm"
                      variant="danger-soft"
                      onPress={() => promptDelete(selectedReview)}
                      onClick={() => promptDelete(selectedReview)}
                      isDisabled={isDeleting}
                      className="px-3.5 h-9 rounded-xl font-bold text-xs cursor-pointer inline-flex items-center gap-1.5 touch-manipulation active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Review</span>
                    </Button>

                    <Button
                      size="sm"
                      onPress={() => setIsModalOpen(false)}
                      onClick={() => setIsModalOpen(false)}
                      className="px-5 h-9 rounded-xl bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-bold text-xs shadow-md shadow-primary/20 cursor-pointer transition-all touch-manipulation active:scale-95"
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

      {/* ════════════════════════════════════════════════════════
          DELETE REVIEW CONFIRMATION MODAL
      ════════════════════════════════════════════════════════ */}
      <Modal isOpen={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Modal.Backdrop
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsDeleteModalOpen(false);
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog className="bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl space-y-4 text-[var(--foreground)]">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-100 dark:border-rose-900/40">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-base font-extrabold text-[var(--foreground)]">
                  Delete Review?
                </h3>
                <p className="text-xs text-[var(--foreground-muted)]">
                  Are you sure you want to permanently delete this customer review? This action cannot be undone.
                </p>

                {reviewToDelete && (
                  <div className="p-3 bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)]/60 border border-[var(--border-color)]/80 dark:border-[var(--border-color)]/60 rounded-2xl text-left space-y-1.5 mt-2">
                    <p className="text-xs font-bold text-[var(--foreground)] line-clamp-1">
                      {reviewToDelete.productTitle || "Product Review"}
                    </p>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3 h-3 ${
                            star <= reviewToDelete.rating
                              ? "fill-amber-400 text-amber-400"
                              : "text-[var(--border-color)] dark:text-[var(--foreground-secondary)]"
                          }`}
                        />
                      ))}
                      <span className="text-[10px] font-bold text-[var(--foreground-muted)] ml-1">
                        ({reviewToDelete.rating}/5)
                      </span>
                    </div>
                    {reviewToDelete.comment && (
                      <p className="text-[11px] text-[var(--foreground-muted)] italic line-clamp-2">
                        "{reviewToDelete.comment}"
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  onPress={() => setIsDeleteModalOpen(false)}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-alt)] hover:bg-[var(--surface-alt)] dark:bg-[var(--surface)] dark:hover:bg-[var(--foreground-muted)] text-[var(--foreground)] font-bold text-xs cursor-pointer transition-colors touch-manipulation active:scale-95"
                >
                  Cancel
                </Button>
                <Button
                  onPress={handleConfirmDelete}
                  onClick={handleConfirmDelete}
                  isDisabled={isDeleting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm cursor-pointer transition-colors inline-flex items-center gap-1.5 touch-manipulation active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "Deleting..." : "Yes, Delete"}</span>
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Review Image Gallery Lightbox */}
      <ImageGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        images={galleryImages}
        initialIndex={galleryIndex}
        productTitle="Review Photos"
      />
    </div>
  );
}
