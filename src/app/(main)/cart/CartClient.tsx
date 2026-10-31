"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Truck,
  Tag,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  ChevronRight,
  Sparkles,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { toast } from "react-toastify";
import { AlertDialog, Button } from "@heroui/react";
import { authClient } from "@/lib/auth-client";
import SuspendedAccountModal from "@/components/shared/SuspendedAccountModal";
import { updateCartItem, removeFromCart, clearCart } from "@/lib/action/cart";
import { checkCouponCode } from "@/lib/action/coupons";
import { isProductOutOfStock, unitsLeft } from "@/lib/stock";
import { getCartByUserId } from "@/lib/api/cart";
import { CartClientProps, CartData, CartItem, CouponQuote } from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";

// ── Fallback Shipping Constants (overridden by site settings) ────────────────
export const STANDARD_SHIPPING_COST = 15.0;
export const FREE_SHIPPING_THRESHOLD = 50.0;

export default function CartClient({ initialCart, user: initialUser }: CartClientProps) {
  const { data: clientSession } = authClient.useSession();
  const user = initialUser || clientSession?.user;
  const { settings, formatPrice } = useSiteSettings();

  // Dynamic shipping values from site settings (admin-configurable)
  const dynamicFreeThreshold = settings.shipping?.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD;
  const dynamicStandardCost = settings.shipping?.standardDeliveryFee ?? STANDARD_SHIPPING_COST;
  const isFreeShippingGloballyEnabled = settings.shipping?.freeShippingEnabled !== false;

  // Show-only promo codes no longer exist: a code is a row the store team or a
  // seller wrote, and the API alone says what it is worth.

  const [cart, setCart] = useState<CartData | null>(initialCart || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCart && Boolean(user?.id));
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Coupon state. The quote is the API's answer for this exact basket, so the
  // whole document comes back rather than a percentage to multiply locally.
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponQuote | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState<boolean>(false);
  const [showSuspendedCheckoutAlert, setShowSuspendedCheckoutAlert] = useState<boolean>(false);

  const isSuspended = ((user as { status?: string })?.status || "").toLowerCase() === "suspended";

  // Fetch cart data when user is available or on mount
  const refreshCart = async () => {
    if (!user?.id) return;
    try {
      setIsLoading(true);
      const res = await getCartByUserId(user.id);
      if (res?.success && res.data) {
        setCart(res.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id && !cart) {
      refreshCart();
    }
  }, [user?.id]);

  // Derived calculations
  const items: CartItem[] = cart?.items || [];
  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const subtotal = items.reduce(
    (acc, item) => acc + (Number(item.product?.price) || 0) * (item.quantity || 0),
    0
  );

  // Check if any cart item is out of stock or exceeds available inventory.
  // A product with no stock count is not tracked, so it raises neither problem.
  const hasInventoryIssues = items.some((item) => {
    const p = item.product;
    const left = unitsLeft(p?.stockQuantity);
    const isOOS = p ? isProductOutOfStock(p) : false;
    const exceeds = left !== null && item.quantity > left;
    return isOOS || exceeds;
  });

  // The discount is the API's number, never a local calculation: only the lines
  // the code is allowed to touch count, at the prices stored on the server.
  const discountValue = appliedCoupon?.discount ?? 0;
  /** Smaller than the subtotal whenever a shop's code covers part of the basket. */
  const coveredByCoupon = appliedCoupon?.eligibleSubtotal ?? 0;

  const isFreeShippingEligible =
    isFreeShippingGloballyEnabled && subtotal >= dynamicFreeThreshold;
  const freeShippingProgress = isFreeShippingGloballyEnabled
    ? Math.min(Math.round((subtotal / dynamicFreeThreshold) * 100), 100)
    : 100;
  const amountToFreeShipping = Math.max(0, dynamicFreeThreshold - subtotal);

  // Shipping cost (single standard shipping method)
  const shippingCost = subtotal === 0 || isFreeShippingEligible ? 0 : dynamicStandardCost;

  // Grand Total (no tax)
  const grandTotal = Math.max(0, subtotal - discountValue + shippingCost);

  // ── Quantity & Item Actions ──────────────────────────────────────────────────
  const handleQuantityChange = async (
    productId: string,
    currentQty: number,
    delta: number,
    maxStock?: number,
    productTitle?: string
  ) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

    // Prevent increasing beyond available stock
    if (delta > 0 && maxStock !== undefined && newQty > maxStock) {
      toast.warning(
        `Only ${maxStock} unit${maxStock === 1 ? "" : "s"} available in stock for "${productTitle || "this product"}"`,
        { icon: <span>⚠️</span> }
      );
      return;
    }

    // Optimistic UI update
    setCart((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.map((item) => {
        const itemProductId = (item.product as any)?._id?.toString?.() || item.product?.id;
        if (itemProductId === productId) {
          const price = item.product?.price || 0;
          return {
            ...item,
            quantity: newQty,
            lineTotal: price * newQty,
          };
        }
        return item;
      });
      const newTotal = updatedItems.reduce((acc, item) => acc + item.lineTotal, 0);
      const newCount = updatedItems.reduce((acc, item) => acc + item.quantity, 0);
      return {
        ...prev,
        items: updatedItems,
        totalPrice: newTotal,
        subtotal: newTotal,
        totalItems: newCount,
        itemCount: newCount,
      };
    });

    setUpdatingItemId(productId);
    try {
      const res = await updateCartItem(productId, newQty);
      if (res?.success === false) {
        toast.error(res?.message || "Failed to update quantity");
        refreshCart();
      } else {
        window.dispatchEvent(new CustomEvent("cart-updated"));
      }
    } catch {
      toast.error("Failed to update cart");
      refreshCart();
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (productId: string, productTitle: string) => {
    // Optimistic UI update
    setCart((prev) => {
      if (!prev) return prev;
      const updatedItems = prev.items.filter((item) => {
        const itemProductId = (item.product as any)?._id?.toString?.() || item.product?.id;
        return itemProductId !== productId;
      });
      const newTotal = updatedItems.reduce((acc, item) => acc + item.lineTotal, 0);
      const newCount = updatedItems.reduce((acc, item) => acc + item.quantity, 0);
      return {
        ...prev,
        items: updatedItems,
        totalPrice: newTotal,
        subtotal: newTotal,
        totalItems: newCount,
        itemCount: newCount,
      };
    });

    setRemovingItemId(productId);
    try {
      const res = await removeFromCart(productId);
      if (res?.success !== false) {
        toast.info(`"${productTitle}" removed from cart`, {
          icon: <span>🗑️</span>,
        });
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        toast.error(res?.message || "Failed to remove item");
        refreshCart();
      }
    } catch {
      toast.error("Failed to remove item");
      refreshCart();
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleClearCart = async () => {
    setIsClearing(true);
    setCart((prev) => (prev ? { ...prev, items: [], totalItems: 0, totalPrice: 0, itemCount: 0, subtotal: 0 } : null));

    try {
      const res = await clearCart();
      if (res?.success !== false) {
        toast.success("Cart cleared successfully");
        window.dispatchEvent(new CustomEvent("cart-updated"));
      } else {
        toast.error(res?.message || "Failed to clear cart");
        refreshCart();
      }
    } catch {
      toast.error("Failed to clear cart");
      refreshCart();
    } finally {
      setIsClearing(false);
    }
  };

  // ── Coupon Handler ───────────────────────────────────────────────────────────
  /** The basket as the API wants it: product ids and counts, nothing about money. */
  const basketLines = () =>
    items
      .map((item) => ({
        productId: String(
          (item.product as unknown as { _id?: string })?._id ||
            item.product?.id ||
            item.id ||
            ""
        ),
        quantity: item.quantity || 1,
      }))
      .filter((line) => line.productId);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();

    if (!code) {
      setCouponError("Please enter a promo code.");
      return;
    }

    if (items.length === 0) {
      setCouponError("There is nothing in the cart to discount yet.");
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const res = await checkCouponCode(code, basketLines());

      // Every refusal carries its own reason, because "invalid code" for a code
      // that is real but starts tomorrow only makes the shopper type it again.
      if (res?.success === false) {
        setAppliedCoupon(null);
        setCouponError(res.message || "Invalid or expired coupon code");
        return;
      }

      const quote = (res as { data?: CouponQuote } | null)?.data;
      if (!quote) {
        setAppliedCoupon(null);
        setCouponError("That code could not be checked just now. Please try again.");
        return;
      }

      setAppliedCoupon(quote);
      setCouponCode("");
      toast.success(`${quote.code} applied — ${formatPrice(quote.discount)} off`);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError((err as Error).message || "That code could not be checked");
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    toast.success("Coupon code removed.");
  };

  /**
   * Keeps the shown discount in step with the basket.
   *
   * This is not a gate — the checkout prices the code again for real. It is the
   * difference between a number that matches what is in the cart and one that
   * remembers an older cart. When the code stops fitting, the API's own reason
   * appears in the same place the first refusal did.
   */
  useEffect(() => {
    if (!appliedCoupon) return;

    const code = appliedCoupon.code;
    let cancelled = false;

    const timer = setTimeout(async () => {
      // An emptied basket has nothing left for the code to sit on.
      if (items.length === 0) {
        setAppliedCoupon(null);
        return;
      }

      try {
        const res = await checkCouponCode(code, basketLines());
        if (cancelled) return;

        if (res?.success === false) {
          setAppliedCoupon(null);
          setCouponError(res.message || `${code} no longer fits this basket`);
          return;
        }

        const quote = (res as { data?: CouponQuote } | null)?.data;
        if (quote) setAppliedCoupon(quote);
      } catch {
        // A quiet failure is allowed here: the code is checked properly when the
        // order is placed.
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Only the basket's shape matters: a line added, removed or resized.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal, itemCount]);

  return (
    <>
    <SuspendedAccountModal
      isOpen={showSuspendedCheckoutAlert}
      onOpenChange={setShowSuspendedCheckoutAlert}
      message="Your account has been suspended. You cannot proceed to checkout. Please contact support for assistance."
    />

    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-300">
      {/* ── Breadcrumbs Bar ── */}
      <div className="bg-[var(--surface-elevated)] border-b border-[var(--border-color)] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <nav className="flex items-center gap-2 text-xs font-medium text-[var(--foreground-muted)]">
            <Link
              href="/"
              className="hover:text-primary transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-[var(--foreground-muted)]" />
            <Link
              href="/shop"
              className="hover:text-primary transition-colors"
            >
              Shop
            </Link>
            <ChevronRight className="w-3 h-3 text-[var(--foreground-muted)]" />
            <span className="text-[var(--foreground)] font-semibold">Shopping Cart</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* ── Unauthenticated User Alert Banner ── */}
        {!user && (
          <div className="mb-6 p-4 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-[var(--foreground)]">
                <span className="font-bold">Sign in</span> to save your cart items across all your devices and checkout faster.
              </p>
            </div>
            <Link
              href="/auth/login?callbackUrl=/cart"
              className="shrink-0 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm shadow-primary/20"
            >
              Sign In Now
            </Link>
          </div>
        )}

        {/* ── Page Title Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
                Shopping Cart
              </h1>
              {itemCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {itemCount} {itemCount === 1 ? "Item" : "Items"}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-[var(--foreground-muted)] mt-1">
              Review your items, apply promotional discounts, and proceed to secure checkout.
            </p>
          </div>

          {items.length > 0 && (
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </Link>
          )}
        </div>

        {/* ── Free Shipping Progress Bar Meter ── */}
        {items.length > 0 && isFreeShippingGloballyEnabled && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-xs">
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2.5">
              <div className="flex items-center gap-2">
                <Truck
                  className={`w-4 h-4 ${
                    isFreeShippingEligible
                      ? "text-emerald-500"
                      : "text-primary animate-pulse"
                  }`}
                />
                {isFreeShippingEligible ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    🎉 Congratulations! You have unlocked FREE Standard Shipping!
                  </span>
                ) : (
                  <span>
                    Add{" "}
                    <strong className="text-[var(--foreground)] font-bold">
                      {formatPrice(amountToFreeShipping)}
                    </strong>{" "}
                    more to qualify for <span className="text-primary font-bold">FREE Shipping</span>!
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-[var(--foreground-muted)]">
                {freeShippingProgress}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-[var(--surface-alt)] rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isFreeShippingEligible
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                    : "bg-primary"
                }`}
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Loading Spinner State ── */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-[var(--foreground-muted)]">
            <RefreshCw className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading your cart items...</p>
          </div>
        )}

        {/* ── Empty Cart State ── */}
        {!isLoading && items.length === 0 && (
          <div className="py-16 sm:py-24 px-4 text-center rounded-3xl bg-[var(--surface-elevated)] border border-[var(--border-color)] shadow-sm flex flex-col items-center justify-center max-w-2xl mx-auto">
            <div className="w-24 h-24 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-6 shadow-inner">
              <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] mb-2">
              Your Shopping Cart is Empty
            </h2>
            <p className="text-[var(--foreground-muted)] text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Looks like you haven&apos;t added any items to your cart yet. Explore our wide range of products and grab the best deals today!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/shop"
                className="px-6 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-bold shadow-md shadow-primary/25 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" /> Start Shopping
              </Link>
              <Link
                href="/dashboard/customer/wishlist"
                className="px-6 py-3.5 rounded-xl bg-[var(--surface-alt)] hover:bg-[var(--surface-alt)]/80 text-[var(--foreground)] text-sm font-bold border border-[var(--border-color)] transition-all flex items-center gap-2 cursor-pointer"
              >
                View Saved Wishlist
              </Link>
            </div>

            {/* Shop shortcuts. These link to filters that exist in every store, so
                they keep working no matter what the site sells. */}
            <div className="mt-12 pt-8 border-t border-[var(--border-color)] w-full">
              <p className="text-xs uppercase tracking-wider font-bold text-[var(--foreground-muted)] mb-4">
                Popular Picks to Explore
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { name: "All Products", href: "/shop" },
                  { name: "New Arrivals", href: "/shop?sort=newest" },
                  { name: "Special Offers", href: "/shop?hasOffer=true" },
                ].map((cat) => (
                  <Link
                    key={cat.name}
                    href={cat.href}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-colors cursor-pointer"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Cart Content Layout (2 Columns) ── */}
        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── Left Column: Items Table & Actions (8 cols) ── */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-color)] shadow-xs overflow-hidden">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-[var(--surface-alt)]/50 border-b border-[var(--border-color)] text-xs font-bold text-[var(--foreground-muted)] uppercase tracking-wider">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-[var(--border-color)]">
                  {items.map((item) => {
                    const product = item.product;
                    const productId: string =
                      (product as any)?._id?.toString?.() ||
                      product?.id ||
                      "";
                    const isUpdating = updatingItemId === productId;
                    const isRemoving = removingItemId === productId;
                    const unitPrice = Number(product?.price) || 0;
                    const lineTotal = unitPrice * item.quantity;
                    const originalPrice = product?.originalPrice ? Number(product.originalPrice) : null;
                    const primaryCategory = product?.categories?.[0] || "Product";

                    // Stock calculations — null means the product is not stock-tracked
                    const stockLeft = unitsLeft(product?.stockQuantity);
                    const isOutOfStock = product ? isProductOutOfStock(product) : false;
                    const maxStock = stockLeft ?? undefined;
                    const exceedsStock = stockLeft !== null && item.quantity > stockLeft;

                    return (
                      <div
                        key={item.id || productId}
                        className={`p-4 sm:p-6 transition-colors duration-200 ${
                          isRemoving ? "opacity-40 pointer-events-none" : "hover:bg-[var(--surface-alt)]/50"
                        }`}
                      >
                        {/* Desktop Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                          {/* Product Info (Col 6) */}
                          <div className="col-span-6 flex items-center gap-4">
                            <Link
                              href={`/shop/${product?.slug || ""}`}
                              className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-[var(--surface-alt)] border border-[var(--border-color)] group cursor-pointer"
                            >
                              <Image
                                src={
                                  product?.image ||
                                  "https://smartview.com.bd/uploads/products/1742452515.webp"
                                }
                                alt={product?.title || "Product"}
                                fill
                                sizes="80px"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </Link>

                            <div className="flex-1 min-w-0 pr-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                {primaryCategory}
                              </span>
                              <Link
                                href={`/shop/${product?.slug || ""}`}
                                className="block font-bold text-sm text-[var(--foreground)] hover:text-primary transition-colors line-clamp-2 mt-0.5"
                              >
                                {product?.title || "Unnamed Product"}
                              </Link>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--foreground-muted)] flex-wrap">
                                {isOutOfStock ? (
                                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[11px] bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
                                    <AlertCircle className="w-3 h-3 text-rose-500" /> Out of Stock
                                  </span>
                                ) : exceedsStock ? (
                                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[11px] bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60">
                                    <AlertCircle className="w-3 h-3 text-amber-500" /> Only {maxStock} in stock
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                                    <CheckCircle2 className="w-3 h-3" /> In Stock {stockLeft !== null ? `(${stockLeft} available)` : ""}
                                  </span>
                                )}
                                {product?.sku && (
                                  <span className="text-[11px]">SKU: {product.sku}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Unit Price (Col 2) */}
                          <div className="col-span-2 text-center">
                            <div className="font-extrabold text-sm text-[var(--foreground)]">
                              {formatPrice(unitPrice)}
                            </div>
                            {originalPrice && originalPrice > unitPrice && (
                              <div className="text-xs text-[var(--foreground-muted)] line-through">
                                {formatPrice(originalPrice)}
                              </div>
                            )}
                          </div>

                          {/* Quantity Controls (Col 2) */}
                          <div className="col-span-2 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="inline-flex items-center rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-1 shadow-2xs">
                                <button
                                  type="button"
                                  disabled={item.quantity <= 1 || isUpdating}
                                  onClick={() => handleQuantityChange(productId, item.quantity, -1, maxStock, product?.title)}
                                  aria-label="Decrease quantity"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>

                                <span className="w-9 text-center text-xs font-bold text-[var(--foreground)]">
                                  {isUpdating ? (
                                    <RefreshCw className="w-3 h-3 animate-spin mx-auto text-primary" />
                                  ) : (
                                    item.quantity
                                  )}
                                </span>

                                <button
                                  type="button"
                                  disabled={isUpdating || isOutOfStock || (maxStock !== undefined && item.quantity >= maxStock)}
                                  onClick={() => handleQuantityChange(productId, item.quantity, 1, maxStock, product?.title)}
                                  aria-label="Increase quantity"
                                  title={
                                    isOutOfStock
                                      ? "Out of stock"
                                      : maxStock !== undefined && item.quantity >= maxStock
                                      ? `Max ${maxStock} in stock`
                                      : "Increase quantity"
                                  }
                                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {exceedsStock && (
                                <span className="text-[10px] text-rose-500 font-semibold text-center">
                                  Max {maxStock} available
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Line Total & Remove Button (Col 2) */}
                          <div className="col-span-2 flex items-center justify-end gap-3">
                            <span className="font-extrabold text-base text-primary">
                              {formatPrice(lineTotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(productId, product?.title || "Item")}
                              aria-label="Remove item"
                              className="p-1.5 rounded-lg text-[var(--foreground-muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile Responsive Layout */}
                        <div className="md:hidden flex gap-3.5">
                          <Link
                            href={`/shop/${product?.slug || ""}`}
                            className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-[var(--surface-alt)] border border-[var(--border-color)]"
                          >
                            <Image
                              src={
                                product?.image ||
                                "https://smartview.com.bd/uploads/products/1742452515.webp"
                              }
                              alt={product?.title || "Product"}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </Link>

                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                                  {primaryCategory}
                                </span>
                                <Link
                                  href={`/shop/${product?.slug || ""}`}
                                  className="block font-bold text-xs text-[var(--foreground)] line-clamp-2 mt-0.5"
                                >
                                  {product?.title || "Unnamed Product"}
                                </Link>

                                <div className="flex items-center gap-2 mt-1">
                                  {isOutOfStock ? (
                                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold text-[10px] bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/60">
                                      <AlertCircle className="w-2.5 h-2.5 text-rose-500" /> Out of Stock
                                    </span>
                                  ) : exceedsStock ? (
                                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-[10px] bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/60">
                                      <AlertCircle className="w-2.5 h-2.5 text-amber-500" /> Only {maxStock} in stock
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[10px]">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> In Stock {product?.stockQuantity !== undefined ? `(${product.stockQuantity} avail)` : ""}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(productId, product?.title || "Item")}
                                aria-label="Remove item"
                                className="p-1 text-[var(--foreground-muted)] hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex items-end justify-between mt-3">
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-[var(--foreground)]">
                                  {formatPrice(unitPrice)}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="text-[10px] text-[var(--foreground-muted)] ml-1.5 font-medium">
                                    Total: {formatPrice(lineTotal)}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-1">
                                <div className="inline-flex items-center rounded-lg border border-[var(--border-color)] dark:border-[var(--border-color)] bg-[var(--surface-alt)]/80 dark:bg-[var(--surface)] p-0.5">
                                  <button
                                    type="button"
                                    disabled={item.quantity <= 1 || isUpdating}
                                    onClick={() => handleQuantityChange(productId, item.quantity, -1, maxStock, product?.title)}
                                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-[var(--foreground-secondary)] disabled:opacity-30"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-7 text-center text-xs font-bold text-slate-900 dark:text-[var(--foreground)]">
                                    {isUpdating ? "..." : item.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isUpdating || isOutOfStock || (maxStock !== undefined && item.quantity >= maxStock)}
                                    onClick={() => handleQuantityChange(productId, item.quantity, 1, maxStock, product?.title)}
                                    title={
                                      isOutOfStock
                                        ? "Out of stock"
                                        : maxStock !== undefined && item.quantity >= maxStock
                                        ? `Max ${maxStock} in stock`
                                        : "Increase quantity"
                                    }
                                    className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-[var(--foreground-secondary)] disabled:opacity-30"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                                {exceedsStock && (
                                  <span className="text-[9px] text-rose-500 font-semibold text-right">
                                    Max {maxStock} available
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Table Bottom Controls Bar */}
                <div className="p-4 sm:p-6 bg-[var(--surface-alt)]/50 dark:bg-[var(--surface)]/30 border-t border-[var(--border-color)] dark:border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-color)] dark:border-[var(--border-color)] bg-[var(--surface-elevated)] dark:bg-[var(--surface)] text-slate-700 dark:text-[var(--foreground)] text-xs font-bold hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--surface-alt)] transition-colors shadow-2xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Continue Shopping
                  </Link>

                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      <button
                        type="button"
                        disabled={isClearing}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {isClearing ? "Clearing..." : "Clear Shopping Cart"}
                      </button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Backdrop isDismissable className="bg-black/60 backdrop-blur-xs">
                      <AlertDialog.Container size="sm">
                        <AlertDialog.Dialog className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-[var(--foreground)] shadow-2xl p-6 space-y-4">
                          {({ close }) => (
                            <>
                              <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/80 dark:border-rose-900/50">
                                  <Trash2 className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                  <AlertDialog.Heading className="text-base font-bold text-[var(--foreground)]">
                                    Clear Shopping Cart?
                                  </AlertDialog.Heading>
                                  <p className="text-xs text-[var(--foreground-muted)] leading-relaxed">
                                    Are you sure you want to remove all items from your shopping cart? This action cannot be undone.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--border-color)]">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onPress={close}
                                  isDisabled={isClearing}
                                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-[var(--border-color)] text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)]"
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  isDisabled={isClearing}
                                  onPress={async () => {
                                    await handleClearCart();
                                    close();
                                  }}
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-xs cursor-pointer"
                                >
                                  {isClearing ? "Clearing..." : "Yes, Clear Cart"}
                                </Button>
                              </div>
                            </>
                          )}
                        </AlertDialog.Dialog>
                      </AlertDialog.Container>
                    </AlertDialog.Backdrop>
                  </AlertDialog.Root>
                </div>
              </div>

              {/* ── Coupon & Promo Code Section ── */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-[var(--foreground)]">
                    Promotional & Coupon Code
                  </h3>
                </div>

                {appliedCoupon ? (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          Coupon <span className="font-mono">{appliedCoupon.code}</span> Applied!
                        </p>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          {appliedCoupon.discountType === "percentage"
                            ? `${appliedCoupon.discountValue}% off · you save ${formatPrice(appliedCoupon.discount)}`
                            : `${formatPrice(appliedCoupon.discountValue)} off · you save ${formatPrice(appliedCoupon.discount)}`}
                        </p>
                        {coveredByCoupon < subtotal && (
                          <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                            The code covers {formatPrice(coveredByCoupon)} of this basket —
                            the rest is from another shop.
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors text-xs font-semibold cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleApplyCoupon} className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError(null);
                        }}
                        placeholder="Enter your promo code"
                        className="w-full h-11 px-4 text-xs font-medium rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isApplyingCoupon}
                      className="h-11 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-sm hover:shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isApplyingCoupon ? "Applying..." : "Apply Coupon"}
                    </button>
                  </form>
                )}

                {couponError && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {couponError}
                  </p>
                )}

                <p className="mt-3 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                  A code comes from the store or from the shop whose products you
                  bought. A shop&apos;s own code only discounts that shop&apos;s items, and
                  what it takes off is settled at checkout.
                </p>
              </div>
            </div>

            {/* ── Right Column: Order Summary Card (4 cols) ── */}
            <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
              <div className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border-color)] shadow-sm">
                <h3 className="text-base font-extrabold text-[var(--foreground)] pb-4 border-b border-[var(--border-color)]">
                  Order Summary
                </h3>

                <div className="py-4 space-y-3.5 text-xs text-[var(--foreground-muted)]">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between">
                    <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                    <span className="font-bold text-[var(--foreground)] text-sm">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {/* Shipping */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)]">
                    <div>
                      <span className="font-semibold text-[var(--foreground)]">
                        {isFreeShippingEligible ? "Free Shipping" : "Standard Shipping"}
                      </span>
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        {isFreeShippingEligible
                          ? "Auto-applied at checkout"
                          : `Estimated delivery in ${settings.shipping?.estimatedDeliveryDays || "2-4 business days"}`}
                      </p>
                    </div>
                    <span className="font-bold text-[var(--foreground)]">
                      {shippingCost === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                          FREE
                        </span>
                      ) : (
                        formatPrice(shippingCost)
                      )}
                    </span>
                  </div>

                  {/* Promo Code Discount */}
                  {discountValue > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold pt-2 border-t border-[var(--border-color)]">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-{formatPrice(discountValue)}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="pt-4 border-t-2 border-[var(--border-color)] flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-[var(--foreground)]">
                        Estimated Total
                      </span>
                      <p className="text-[10px] text-[var(--foreground-muted)]">Includes applicable discounts & shipping</p>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-primary">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="mt-6 space-y-3">
                  {hasInventoryIssues && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Stock issues detected</p>
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">
                          Some items are out of stock or exceed available inventory. Please adjust quantities or remove out-of-stock items before checkout.
                        </p>
                      </div>
                    </div>
                  )}

                  {hasInventoryIssues ? (
                    <button
                      type="button"
                      disabled
                      className="w-full h-12 rounded-xl bg-[var(--surface-alt)] text-[var(--foreground-muted)] font-extrabold text-sm flex items-center justify-center gap-2 cursor-not-allowed opacity-80"
                    >
                      <Lock className="w-4 h-4" />
                      Resolve Stock Issues to Checkout
                    </button>
                  ) : isSuspended ? (
                    <button
                      type="button"
                      onClick={() => setShowSuspendedCheckoutAlert(true)}
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm shadow-md shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  ) : (
                    <Link
                      href={
                        user
                          ? appliedCoupon
                            ? `/checkout?coupon=${encodeURIComponent(appliedCoupon.code)}`
                            : "/checkout"
                          : "/auth/login?callbackUrl=/checkout"
                      }
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary-hover text-white font-extrabold text-sm shadow-md shadow-primary/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  )}

                  <p className="text-[11px] text-center text-[var(--foreground-muted)] flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Guaranteed 256-bit Encrypted Checkout
                  </p>
                </div>

                {/* Trust Badges & Guarantees */}
                <div className="mt-6 pt-6 border-t border-[var(--border-color)] space-y-3">
                  <div className="flex items-center gap-3 text-xs text-[var(--foreground-muted)]">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--foreground)]">Fast & Tracked Shipping</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">Free delivery on orders over $150</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[var(--foreground-muted)]">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[var(--foreground)]">Flexible Payment Options</p>
                      <p className="text-[10px] text-[var(--foreground-muted)]">Visa, Mastercard, Amex, PayPal</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}