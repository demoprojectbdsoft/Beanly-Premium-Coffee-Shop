"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingBag, Heart, Repeat, Eye, Star, Sparkles, Share2 } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import SuspendedAccountModal from "@/components/shared/SuspendedAccountModal";
import { addToCart, isCarted as checkIsCartedAction } from "@/lib/action/cart";
import {
  addToWishlist,
  removeFromWishlist,
  isWishlisted as checkIsWishlistedAction,
} from "@/lib/action/wishlist";
import { getReviewsByProductId } from "@/lib/api/reviews";
import { COMPARE_LIMIT, useCompare } from "@/lib/compare";
import { hasOfferDiscount } from "@/lib/offer";
import { isProductOutOfStock } from "@/lib/stock";
import { Product } from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";

// ── Star Rating Component ────────────────────────────────────────────────────
function StarRating({
  rating = 0,
  reviewCount = 0,
}: {
  rating?: number;
  reviewCount?: number;
}) {
  const numericRating = Number(rating) || 0;
  const count = Number(reviewCount) || 0;

  return (
    <div
      className="flex items-center gap-1.5 py-0.5"
      title={
        numericRating > 0
          ? `${numericRating.toFixed(1)} out of 5 stars (${count} reviews)`
          : "No reviews yet"
      }
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => {
          const fillPercentage =
            Math.min(Math.max(numericRating - (star - 1), 0), 1) * 100;
          return (
            <div
              key={star}
              className="relative inline-flex w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0"
            >
              {/* Empty background star */}
              <Star className="w-full h-full text-[var(--border-color)] dark:text-[var(--foreground-muted)]/40 fill-[var(--border-color)]/60 dark:fill-[var(--foreground-muted)]/20" />
              {/* Partially/fully filled foreground star */}
              {fillPercentage > 0 && (
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillPercentage}%` }}
                >
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 text-[10px] sm:text-[11px] leading-none">
        {numericRating > 0 ? (
          <>
            <span className="font-bold text-amber-500 dark:text-amber-400">
              {numericRating.toFixed(1)}
            </span>
            {count > 0 && (
              <span className="text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] font-medium">
                ({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})
              </span>
            )}
          </>
        ) : (
          <span className="text-[var(--foreground-muted)] dark:text-[var(--foreground-muted)] text-[9px] sm:text-[10px]">
            (0)
          </span>
        )}
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: Product;
  hasRightBorder?: boolean;
  showDiscountBadge?: boolean;
}

export default function ProductCard({
  product,
  hasRightBorder = true,
  showDiscountBadge = true,
}: ProductCardProps) {
  // ── Session & Auth ──────────────────────────────────────────────────────────
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  const { formatPrice } = useSiteSettings();
  const compare = useCompare();
  const isCompared = compare.has(product.id);
  const user = session?.user;
  const userRole = ((user as { role?: string })?.role || "").toLowerCase();
  const isOwner = Boolean(
    user?.id && product?.ownerId && String(user.id) === String(product.ownerId)
  );

  // ── Local Component State ──────────────────────────────────────────────────
  const [imgSrc, setImgSrc] = useState<string>(product.image);
  const [isWishlisted, setIsWishlisted] = useState<boolean>(false);
  const [isInCart, setIsInCart] = useState<boolean>(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState<boolean>(false);
  const [rating, setRating] = useState<number>(Number(product.rating) || 0);
  const [reviewCount, setReviewCount] = useState<number>(Number(product.reviewCount) || 0);
  const [showSuspendedAlert, setShowSuspendedAlert] = useState<boolean>(false);

  const isSuspended = ((user as { status?: string })?.status || "").toLowerCase() === "suspended";
  // A product saved without a stock number is not tracked, so it is never sold out.
  const isOutOfStock = isProductOutOfStock(product);

  // A deal needs a lower selling price than the original price. Without that
  // gap there is no offer, so the card shows neither a timer nor an old price.
  const hasDiscount = hasOfferDiscount(product.price, product.originalPrice);

  // ── Deal Countdown ───────────────────────────────────────────────────────
  const offerTarget = useMemo(() => {
    if (!product?.offerEndDate) return null;
    const d = new Date(product.offerEndDate);
    return isNaN(d.getTime()) ? null : d;
  }, [product?.offerEndDate]);

  const [dealTime, setDealTime] = useState({ d: 0, h: 0, m: 0, s: 0, active: false });

  useEffect(() => {
    if (!offerTarget) return;
    const tick = () => {
      const diff = offerTarget.getTime() - Date.now();
      if (diff > 0) {
        setDealTime({
          d: Math.floor(diff / 86_400_000),
          h: Math.floor((diff / 3_600_000) % 24),
          m: Math.floor((diff / 60_000) % 60),
          s: Math.floor((diff / 1_000) % 60),
          active: true,
        });
      } else {
        setDealTime({ d: 0, h: 0, m: 0, s: 0, active: false });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [offerTarget]);

  const showDealBadge = offerTarget !== null && dealTime.active && hasDiscount;

  // ── Fetch Live Reviews, Wishlist & Cart Status ─────────────────────────────
  // 1. Queries latest reviews to calculate dynamic average rating & review count.
  // 2. Checks if product is wishlisted and listens to "wishlist-updated" event.
  // 3. Checks if product is already in cart and listens to "cart-updated" event.
  useEffect(() => {
    if (!product?.id) return;

    // 1. Load reviews to compute live rating and count (same as details page)
    getReviewsByProductId(product.id)
      .then((res) => {
        const list = res?.data?.reviews || [];
        if (list.length > 0) {
          const avg = list.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / list.length;
          setRating(avg);
          setReviewCount(list.length);
        }
      })
      .catch(() => {});

    // 2. Load wishlist status from backend
    const loadWishlist = () => {
      checkIsWishlistedAction(product.id)
        .then((res) => {
          if (res?.isWishlisted !== undefined) setIsWishlisted(Boolean(res.isWishlisted));
        })
        .catch(() => {});
    };

    // 3. Load cart status from backend
    const loadCart = () => {
      checkIsCartedAction(product.id)
        .then((res) => {
          if (res?.isInCart !== undefined || res?.isCarted !== undefined) {
            setIsInCart(Boolean(res.isInCart || res.isCarted));
          }
        })
        .catch(() => {});
    };

    loadWishlist();
    loadCart();

    // Re-check status whenever changes occur anywhere in the app
    window.addEventListener("wishlist-updated", loadWishlist);
    window.addEventListener("cart-updated", loadCart);
    return () => {
      window.removeEventListener("wishlist-updated", loadWishlist);
      window.removeEventListener("cart-updated", loadCart);
    };
  }, [product?.id]);

  // ── Action Handlers ─────────────────────────────────────────────────────────

  // Add 1 quantity of this product to cart and immediately notify Navbar via "cart-updated"
  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.warning(`"${product.title}" is currently out of stock!`, {
        icon: <span>⚠️</span>,
      });
      return;
    }

    if (!user) {
      toast.info("Please log in to add items to your cart", {
        icon: <span>🔒</span>,
      });
      const returnUrl = pathname || (product.slug ? `/shop/${product.slug}` : `/shop/${product.id}`);
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }

    if (userRole === "admin" || userRole === "demoadmin") {
      toast.warning(
        userRole === "demoadmin"
          ? "Demo admin cannot add products to cart!"
          : "Admin cannot add products to cart!",
        {
          icon: <span>🛡️</span>,
        }
      );
      return;
    }
    if (isOwner) {
      toast.warning("You cannot add your own product to cart!", {
        icon: <span>⚠️</span>,
      });
      return;
    }

    // If already in cart, prevent duplicate add
    if (isInCart) {
      toast.info(`"${product.title}" is already in your cart!`, {
        icon: <span>🛒</span>,
      });
      return;
    }

    try {
      const res = await addToCart(product.id, 1);
      if (res?.success !== false) {
        setIsInCart(true);
        toast.success(`"${product.title}" added to cart!`, {
          icon: <span>🛒</span>,
        });
        // Notify Navbar / CartButton to update count without refresh
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        toast.error(res?.message || "Failed to add to cart");
      }
    } catch {
      toast.error("Failed to add to cart");
    }
  };

  // Toggle wishlist state and immediately notify Navbar via "wishlist-updated"
  const handleToggleWishlist = async () => {
    if (isWishlistLoading) return;
    if (!user) {
      toast.info("Please log in to add items to your wishlist", {
        icon: <span>🔒</span>,
      });
      const returnUrl = pathname || (product.slug ? `/shop/${product.slug}` : `/shop/${product.id}`);
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!isWishlisted) {
      if (userRole === "admin" || userRole === "demoadmin") {
        toast.warning(
          userRole === "demoadmin"
            ? "Demo admin cannot add products to wishlist!"
            : "Admin cannot add products to wishlist!",
          {
            icon: <span>🛡️</span>,
          }
        );
        return;
      }
      if (isOwner) {
        toast.warning("You cannot add your own product to wishlist!", {
          icon: <span>⚠️</span>,
        });
        return;
      }
    }
    setIsWishlistLoading(true);
    try {
      if (isWishlisted) {
        const res = await removeFromWishlist(product.id);
        if (res?.success !== false) {
          setIsWishlisted(false);
          toast.info(`"${product.title}" removed from wishlist!`, {
            icon: <span>💔</span>,
          });
          // Notify Navbar / WishlistButton to update count without refresh
          window.dispatchEvent(new CustomEvent("wishlist-updated"));
        } else {
          toast.error(res?.message || "Failed to remove from wishlist");
        }
      } else {
        const res = await addToWishlist(product.id);
        if (res?.success !== false) {
          setIsWishlisted(true);
          toast.success(`"${product.title}" added to wishlist!`, {
            icon: <span>❤️</span>,
          });
          // Notify Navbar / WishlistButton to update count without refresh
          window.dispatchEvent(new CustomEvent("wishlist-updated"));
        } else {
          toast.error(res?.message || "Failed to add to wishlist");
        }
      }
    } catch {
      toast.error("Failed to update wishlist");
    } finally {
      setIsWishlistLoading(false);
    }
  };

  const handleAddToCompare = () => {
    if (isCompared) {
      compare.remove(product.id);
      toast.info(`"${product.title}" removed from compare.`);
      return;
    }

    const result = compare.add(product);

    if (result === "full") {
      toast.warning(`You can compare up to ${COMPARE_LIMIT} products. Remove one first.`);
      return;
    }
    if (result === "duplicate") {
      toast.info("This product is already in your compare list.");
      return;
    }

    toast.success(`"${product.title}" added to compare!`, {
      icon: <span>🔁</span>,
    });
  };

  // Share this product: native share sheet when available, otherwise copy the
  // product link (the card URL, not the current page) to the clipboard.
  const handleShare = async () => {
    const productUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/shop/${product.slug || product.id}`
        : "";
    const shareData = {
      title: product.title,
      text: `Check out ${product.title} on Sparq!`,
      url: productUrl,
    };

    if (
      typeof navigator !== "undefined" &&
      navigator.share &&
      typeof navigator.canShare === "function" &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
      }
    }

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(productUrl);
        toast.success("Product link copied to clipboard!", {
          icon: <span>🔗</span>,
        });
      } else {
        toast.info("Share URL: " + productUrl);
      }
    } catch {
      toast.error("Failed to copy link");
    }
  };
  // ────────────────────────────────────────────────────────────────────────────

  const categoryText = product.categories?.join(", ") || "Product";

  // The seller's name only appears when the row came with one: platform stock
  // has no shop to visit, and a card invented from the id alone would link to
  // a page the API would answer 404 for.
  const sellerName = product.seller?.name || "";
  const sellerHref = product.seller?.slug ? `/stores/${product.seller.slug}` : "";
  
  const formattedPrice = formatPrice(product.price);

  const formattedOriginalPrice = product.originalPrice
    ? formatPrice(product.originalPrice)
    : null;

  const discountPercent =
    product.discountPercentage ??
    (product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null);

  return (
    <>
    <SuspendedAccountModal
      isOpen={showSuspendedAlert}
      onOpenChange={setShowSuspendedAlert}
      message="Your account has been suspended. You are not allowed to add items to the cart. Please contact support for assistance."
    />

    <div
      className={`group relative flex flex-col justify-between p-2.5 sm:p-4 
        bg-[var(--surface-elevated)] 
        transition-all duration-300 ease-out h-full 
        hover:shadow-xl hover:shadow-black/5 dark:hover:shadow-black/40 z-0 hover:z-20 rounded-xl border border-[var(--border-color)]/60 ${
        hasRightBorder ? "border-r border-[var(--border-color)]" : ""
      }`}
    >
      {/* Active Wishlist Badge (visible when wishlisted) */}
      {isWishlisted && (
        <div
          title="Wishlisted"
          className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10 p-1 sm:p-1.5 rounded-full bg-red-50 dark:bg-red-950/80 text-red-500 border border-red-200 dark:border-red-800 shadow-sm"
        >
          <Heart className="w-3 h-3 fill-red-500 text-red-500" />
        </div>
      )}

      {/* Deal Countdown Badge — top-left, below wishlist if wishlisted */}
      {showDealBadge && (
        <div className={`absolute ${isWishlisted ? "top-9 sm:top-11" : "top-2 sm:top-3"} left-2 sm:left-3 z-10`}>
          <div className="flex items-center gap-0.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full px-1.5 py-0.5 shadow-md shadow-red-500/30 border border-red-400/30">
            <span className="text-[8px] font-black uppercase tracking-wide mr-0.5 opacity-80">⏱</span>
            <span className="text-[9px] sm:text-[10px] font-black tabular-nums leading-none">
              {dealTime.d > 0 && `${String(dealTime.d).padStart(2, "0")}d `}{String(dealTime.h).padStart(2, "0")}:{String(dealTime.m).padStart(2, "0")}:{String(dealTime.s).padStart(2, "0")}
            </span>
          </div>
        </div>
      )}

      {/* Top-Right Badge: Discount Only */}
      {showDiscountBadge && discountPercent && discountPercent > 0 ? (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 px-1.5 sm:px-2 py-0.5 rounded-full bg-brand-gradient text-[var(--on-grad-text)] text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
          -{discountPercent}%
        </div>
      ) : null}

      {/* Top Image Area */}
      <div className="relative w-full h-32 sm:h-44 md:h-48 overflow-hidden rounded-lg bg-[var(--surface-alt)] border border-[var(--border-color)]/60 backdrop-blur-xs mb-2 sm:mb-3">
        <Link
          href={`/shop/${product.slug}`}
          className="relative w-full h-full block cursor-pointer"
        >
          <Image
            src={imgSrc}
            alt={product.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            onError={() => {
              setImgSrc(
                "https://smartview.com.bd/uploads/products/1742452515.webp"
              );
            }}
            className={`object-cover transition-transform duration-500 ease-out group-hover:scale-105 ${
              isOutOfStock ? "grayscale-[20%] opacity-90" : ""
            }`}
          />
        </Link>

        {/* Floating Actions (Glassmorphism Pill overlay) — reveals on hover.
            Each action is a filled circular button so icons read clearly. */}
        <div className="flex absolute bottom-2 left-1/2 -translate-x-1/2 items-center gap-1.5 p-1.5 bg-[var(--surface-elevated)]/95 backdrop-blur-md rounded-full border border-[var(--border-color)] shadow-lg shadow-black/10 dark:shadow-black/40 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out z-10">
          <button
            type="button"
            title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={handleToggleWishlist}
            disabled={isWishlistLoading}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer disabled:cursor-wait ${
              isWishlisted
                ? "bg-red-500 text-white shadow-sm shadow-red-500/30"
                : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-red-500 hover:text-white shadow-sm"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-all ${isWishlisted ? "fill-white" : ""}`}
            />
          </button>
          <button
            type="button"
            title={isCompared ? "Remove from compare" : "Add to compare"}
            aria-label={isCompared ? "Remove from compare" : "Add to compare"}
            onClick={handleAddToCompare}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isCompared
                ? "bg-primary text-white shadow-sm shadow-primary/30"
                : "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-primary hover:text-white shadow-sm"
            }`}
          >
            <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <Link
            href={`/shop/${product.slug}`}
            title="Quick View"
            aria-label="Quick View"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-primary hover:text-white shadow-sm transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </Link>
          <button
            type="button"
            title="Share"
            aria-label="Share product"
            onClick={handleShare}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-primary hover:text-white shadow-sm transition-all cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>

      {/* Below Image: Category, Title, Rating & Description */}
      <div className="flex-1 flex flex-col space-y-1 mb-2 sm:mb-3">
        <div className="flex items-center justify-between gap-1">
          <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-primary truncate opacity-90">
            {categoryText}
          </p>
          {product.isFeatured && (
            <span
              title="Featured Product"
              className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-300/60 dark:border-amber-600/50 shadow-2xs shrink-0"
            >
              <Sparkles className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
              Featured
            </span>
          )}
        </div>
        <Link href={`/shop/${product.slug}`} className="block group/title">
          {/* Star Rating */}
          <StarRating rating={rating} reviewCount={reviewCount} />
          <h3 className="text-xs sm:text-[13px] font-semibold text-[var(--foreground)] leading-snug line-clamp-2 group-hover/title:text-primary transition-colors cursor-pointer mt-0.5">
            {product.title}
          </h3>
        </Link>

        {sellerName && (
          <p className="text-[10px] sm:text-[11px] text-[var(--foreground-muted)] leading-none">
            {sellerHref ? (
              <Link
                href={sellerHref}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                Sold by <span className="font-semibold">{sellerName}</span>
              </Link>
            ) : (
              <span>Sold by {sellerName}</span>
            )}
          </p>
        )}

        {product.description && (
          <p className="hidden sm:block text-[11px] text-[var(--foreground-muted)] truncate leading-relaxed">
            {product.description}
          </p>
        )}
      </div>

      {/* Bottom Footer: Price & Add To Cart */}
      <div className="flex items-end justify-between pt-1.5 sm:pt-2 border-t border-[var(--border-color)]">
        <div className="flex flex-col">
          {formattedOriginalPrice && hasDiscount ? (
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] text-[var(--foreground-muted)] line-through leading-none pb-0.5">
                {formattedOriginalPrice}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-red-500 dark:text-red-400 leading-tight">
                {formattedPrice}
              </span>
            </div>
          ) : (
            <span className="text-sm sm:text-base font-extrabold text-[var(--foreground)] leading-tight">
              {formattedPrice}
            </span>
          )}
        </div>

        {/* Cart Action Area — Out of Stock badge displayed beside button */}
        <div className="flex items-center gap-2">
          {isOutOfStock && (
            <span
              title="Out of stock"
              className="inline-flex items-center text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 whitespace-nowrap"
            >
              Out of stock
            </span>
          )}

          {/* Add To Cart Button — disabled when out of stock or already in cart */}
          <button
            type="button"
            aria-label={
              isOutOfStock
                ? "Out of stock"
                : isInCart
                ? "Already in cart"
                : "Add to cart"
            }
            onClick={handleAddToCart}
            disabled={isOutOfStock || isInCart}
            className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full shadow-xs flex items-center justify-center transition-all duration-300 ${
              isOutOfStock
                ? "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border border-[var(--border-color)] cursor-not-allowed opacity-60 shadow-none"
                : isInCart
                ? "bg-brand-gradient text-[var(--on-grad-text)] border-transparent shadow-lg shadow-brand cursor-default"
                : "bg-[var(--surface)] text-[var(--foreground)] border border-[var(--border-color)] hover:bg-brand-gradient hover:text-[var(--on-grad-text)] hover:border-transparent hover:shadow-brand hover:scale-105 active:scale-95 cursor-pointer"
            }`}
            title={
              isOutOfStock
                ? "Out of stock"
                : isInCart
                ? "Already in cart"
                : "Add to cart"
            }
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}