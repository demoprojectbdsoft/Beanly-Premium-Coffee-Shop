"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { ShoppingBag, Heart, Repeat, Eye, Star } from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import { addToCart, isCarted as checkIsCartedAction } from "@/lib/action/cart";
import {
  addToWishlist,
  removeFromWishlist,
  isWishlisted as checkIsWishlistedAction,
} from "@/lib/action/wishlist";
import { getReviewsByProductId } from "@/lib/api/reviews";
import { Product } from "@/types";

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
              <Star className="w-full h-full text-gray-200 dark:text-gray-700/80 fill-gray-200/60 dark:fill-gray-700/40" />
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
              <span className="text-gray-400 dark:text-gray-500 font-medium">
                ({count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count})
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-[9px] sm:text-[10px]">
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
    if (!user) {
      toast.info("Please log in to add items to your cart", {
        icon: <span>🔒</span>,
      });
      const returnUrl = pathname || (product.slug ? `/shop/${product.slug}` : `/shop/${product.id}`);
      router.push(`/auth/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (userRole === "admin") {
      toast.warning("Admin cannot add products to cart!", {
        icon: <span>🛡️</span>,
      });
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
      if (userRole === "admin") {
        toast.warning("Admin cannot add products to wishlist!", {
          icon: <span>🛡️</span>,
        });
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
    toast.info(`"${product.title}" added to compare!`, {
      icon: <span>🔁</span>,
    });
  };
  // ────────────────────────────────────────────────────────────────────────────

  const categoryText = product.categories?.join(", ") || "Electronics";
  
  const formattedPrice = `$${product.price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const formattedOriginalPrice = product.originalPrice
    ? `$${product.originalPrice.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : null;

  const discountPercent =
    product.discountPercentage ??
    (product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null);

  return (
    <div
      className={`group relative flex flex-col justify-between p-2.5 sm:p-4 
        bg-gradient-to-br from-sky-50/80 via-blue-50/30 to-slate-50 
        dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-950 
        transition-all duration-300 ease-out h-full 
        hover:shadow-xl hover:shadow-sky-900/10 dark:hover:shadow-black/60 z-0 hover:z-20 rounded-xl ${
        hasRightBorder ? "border-r border-sky-100/80 dark:border-gray-800" : ""
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

      {/* Discount Badge */}
      {showDiscountBadge && discountPercent && discountPercent > 0 ? (
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 px-1.5 sm:px-2 py-0.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 text-white text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider shadow-sm shadow-sky-500/20">
          -{discountPercent}%
        </div>
      ) : null}

      {/* Top Image Area */}
      <div className="relative w-full h-32 sm:h-44 md:h-48 overflow-hidden rounded-lg bg-white/60 dark:bg-gray-800/40 border border-sky-100/50 dark:border-gray-800/50 backdrop-blur-xs mb-2 sm:mb-3">
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
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        </Link>

        {/* Floating Actions (Glassmorphism Pill overlay) — reveals on hover */}
        <div className="flex absolute bottom-2 left-1/2 -translate-x-1/2 items-center gap-1 p-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-full border border-sky-100 dark:border-gray-700/80 shadow-md translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out z-10">
          <button
            type="button"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={handleToggleWishlist}
            disabled={isWishlistLoading}
            className={`p-1.5 rounded-full transition-all cursor-pointer group/btn ${
              isWishlisted
                ? "text-red-500 bg-red-50 dark:bg-red-950/40"
                : "text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            }`}
          >
            <Heart
              className={`w-3.5 h-3.5 transition-all ${
                isWishlisted
                  ? "fill-red-500 text-red-500"
                  : "group-hover/btn:fill-red-500"
              }`}
            />
          </button>
          <span className="w-[1px] h-3 bg-gray-200 dark:bg-gray-700" />
          <button
            type="button"
            aria-label="Add to compare"
            onClick={handleAddToCompare}
            className="p-1.5 rounded-full text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all cursor-pointer"
          >
            <Repeat className="w-3.5 h-3.5" />
          </button>
          <span className="w-[1px] h-3 bg-gray-200 dark:bg-gray-700" />
          <Link
            href={`/shop/${product.slug}`}
            aria-label="Quick View"
            className="p-1.5 rounded-full text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Below Image: Category, Title, Rating & Description */}
      <div className="flex-1 flex flex-col space-y-1 mb-2 sm:mb-3">
        <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-sky-600/80 dark:text-sky-400/80 truncate">
          {categoryText}
        </p>
        <Link href={`/shop/${product.slug}`} className="block group/title">
          {/* Star Rating */}
          <StarRating rating={rating} reviewCount={reviewCount} />
          <h3 className="text-xs sm:text-[13px] font-semibold text-gray-800 dark:text-gray-100 leading-snug line-clamp-2 group-hover/title:text-sky-600 dark:group-hover/title:text-sky-400 transition-colors cursor-pointer mt-0.5">
            {product.title}
          </h3>
        </Link>

        {product.description && (
          <p className="hidden sm:block text-[11px] text-gray-500 dark:text-gray-400 truncate leading-relaxed">
            {product.description}
          </p>
        )}
      </div>

      {/* Bottom Footer: Price & Add To Cart */}
      <div className="flex items-end justify-between pt-1.5 sm:pt-2 border-t border-sky-100/50 dark:border-gray-800/60">
        <div className="flex flex-col">
          {formattedOriginalPrice ? (
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 line-through leading-none pb-0.5">
                {formattedOriginalPrice}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-red-500 dark:text-red-400 leading-tight">
                {formattedPrice}
              </span>
            </div>
          ) : (
            <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white leading-tight">
              {formattedPrice}
            </span>
          )}
        </div>

        {/* Add To Cart Button — displays in active state when already in cart */}
        <button
          type="button"
          aria-label={isInCart ? "Already in cart" : "Add to cart"}
          onClick={handleAddToCart}
          className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full shadow-xs flex items-center justify-center transition-all duration-300 ${
            isInCart
              ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white border-transparent shadow-lg shadow-sky-500/30 cursor-default"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-sky-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-sky-500 hover:to-blue-600 hover:text-white hover:border-transparent hover:shadow-lg hover:shadow-sky-500/30 hover:scale-105 active:scale-95 cursor-pointer"
          }`}
          title={isInCart ? "Already in cart" : "Add to cart"}
        >
          <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.2]" />
        </button>
      </div>
    </div>
  );
}