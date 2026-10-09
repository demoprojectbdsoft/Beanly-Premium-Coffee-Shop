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
import { getCartByUserId } from "@/lib/api/cart";
import { CartClientProps, CartData, CartItem } from "@/types";

// ── Configurable Shipping Settings ───────────────────────────────────────────
export const STANDARD_SHIPPING_COST = 15.0; // Flat standard shipping rate ($)
export const FREE_SHIPPING_THRESHOLD = 50.0; // Minimum subtotal for free shipping ($)

export default function CartClient({ initialCart, user: initialUser }: CartClientProps) {
  const { data: clientSession } = authClient.useSession();
  const user = initialUser || clientSession?.user;

  const [cart, setCart] = useState<CartData | null>(initialCart || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCart && Boolean(user?.id));
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState<boolean>(false);

  // Coupon state
  const [couponCode, setCouponCode] = useState<string>("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPercent?: number;
    discountAmount?: number;
  } | null>(null);
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

  // Coupon calculation
  let discountValue = 0;
  let isCouponFreeShipping = false;
  if (appliedCoupon) {
    if (appliedCoupon.discountPercent) {
      discountValue = (subtotal * appliedCoupon.discountPercent) / 100;
    } else if (appliedCoupon.discountAmount) {
      discountValue = Math.min(appliedCoupon.discountAmount, subtotal);
    } else if (appliedCoupon.code === "FREESHIP") {
      isCouponFreeShipping = true;
    }
  }

  const isFreeShippingEligible = subtotal >= FREE_SHIPPING_THRESHOLD || isCouponFreeShipping;
  const freeShippingProgress = Math.min(
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100),
    100
  );
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // Shipping cost (single standard shipping method)
  const shippingCost = subtotal === 0 || isFreeShippingEligible ? 0 : STANDARD_SHIPPING_COST;

  // Grand Total (no tax)
  const grandTotal = Math.max(0, subtotal - discountValue + shippingCost);

  // ── Quantity & Item Actions ──────────────────────────────────────────────────
  const handleQuantityChange = async (productId: string, currentQty: number, delta: number) => {
    const newQty = currentQty + delta;
    if (newQty < 1) return;

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
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();

    if (!code) {
      setCouponError("Please enter a valid promo code.");
      return;
    }

    setIsApplyingCoupon(true);
    setTimeout(() => {
      if (code === "ELECTRO10") {
        setAppliedCoupon({ code, discountPercent: 10 });
        toast.success("Promo code applied! 10% discount added.");
        setCouponCode("");
      } else if (code === "ELECTRO20") {
        setAppliedCoupon({ code, discountPercent: 20 });
        toast.success("Promo code applied! 20% discount added.");
        setCouponCode("");
      } else if (code === "SAVE15") {
        setAppliedCoupon({ code, discountAmount: 15 });
        toast.success("Promo code applied! $15 discount added.");
        setCouponCode("");
      } else if (code === "FREESHIP") {
        setAppliedCoupon({ code, discountPercent: 0, discountAmount: 0 });
        toast.success("Promo code applied! Free shipping unlocked.");
        setCouponCode("");
      } else {
        setCouponError("Invalid or expired coupon code. Try 'ELECTRO10' or 'SAVE15'");
      }
      setIsApplyingCoupon(false);
    }, 400);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError(null);
    toast.success("Coupon code removed.");
  };

  return (
    <>
    <SuspendedAccountModal
      isOpen={showSuspendedCheckoutAlert}
      onOpenChange={setShowSuspendedCheckoutAlert}
      message="Your account has been suspended. You cannot proceed to checkout. Please contact support for assistance."
    />

    <div className="min-h-screen bg-slate-50/60 dark:bg-[#0b1120] text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* ── Breadcrumbs Bar ── */}
      <div className="bg-white dark:bg-slate-900 border-b border-sky-100 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Link
              href="/"
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              Home
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <Link
              href="/shop"
              className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
            >
              Shop
            </Link>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="text-slate-900 dark:text-white font-semibold">Shopping Cart</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* ── Unauthenticated User Alert Banner ── */}
        {!user && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-sky-950/40 dark:to-slate-900 border border-sky-200/80 dark:border-sky-900/60 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 dark:bg-sky-400/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-slate-700 dark:text-slate-200">
                <span className="font-bold text-slate-900 dark:text-white">Sign in</span> to save your cart items across all your devices and checkout faster.
              </p>
            </div>
            <Link
              href="/auth/login?callbackUrl=/cart"
              className="shrink-0 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-sm hover:shadow-sky-500/20"
            >
              Sign In Now
            </Link>
          </div>
        )}

        {/* ── Page Title Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Shopping Cart
              </h1>
              {itemCount > 0 && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                  {itemCount} {itemCount === 1 ? "Item" : "Items"}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Review your items, apply promotional discounts, and proceed to secure checkout.
            </p>
          </div>

          {items.length > 0 && (
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </Link>
          )}
        </div>

        {/* ── Free Shipping Progress Bar Meter ── */}
        {items.length > 0 && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-xs sm:text-sm font-medium mb-2.5">
              <div className="flex items-center gap-2">
                <Truck
                  className={`w-4 h-4 ${
                    isFreeShippingEligible
                      ? "text-emerald-500"
                      : "text-sky-600 dark:text-sky-400 animate-pulse"
                  }`}
                />
                {isFreeShippingEligible ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    🎉 Congratulations! You have unlocked FREE Standard Shipping!
                  </span>
                ) : (
                  <span>
                    Add{" "}
                    <strong className="text-slate-900 dark:text-white font-bold">
                      ${amountToFreeShipping.toFixed(2)}
                    </strong>{" "}
                    more to qualify for <span className="text-sky-600 dark:text-sky-400 font-bold">FREE Shipping</span>!
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {freeShippingProgress}%
              </span>
            </div>

            <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  isFreeShippingEligible
                    ? "bg-gradient-to-r from-emerald-400 to-teal-500"
                    : "bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500"
                }`}
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Loading Spinner State ── */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
            <p className="text-sm font-medium">Loading your cart items...</p>
          </div>
        )}

        {/* ── Empty Cart State ── */}
        {!isLoading && items.length === 0 && (
          <div className="py-16 sm:py-24 px-4 text-center rounded-3xl bg-white dark:bg-slate-900 border border-sky-100 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center max-w-2xl mx-auto">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sky-100 via-blue-50 to-indigo-100 dark:from-slate-800 dark:via-sky-950/40 dark:to-slate-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-6 shadow-inner">
              <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
              Your Shopping Cart is Empty
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-8 leading-relaxed">
              Looks like you haven&apos;t added any items to your cart yet. Explore our wide range of top-notch electronics and grab the best deals today!
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/shop"
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-sm font-bold shadow-md shadow-sky-500/25 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" /> Start Shopping
              </Link>
              <Link
                href="/dashboard/customer/wishlist"
                className="px-6 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-all flex items-center gap-2"
              >
                View Saved Wishlist
              </Link>
            </div>

            {/* Popular Category Shortcuts */}
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800/80 w-full">
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400 mb-4">
                Popular Categories to Explore
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { name: "Smartphones", href: "/shop?category=smartphones" },
                  { name: "Laptops & Computers", href: "/shop?category=laptops" },
                  { name: "Headphones & Audio", href: "/shop?category=headphones" },
                  { name: "Smartwatches", href: "/shop?category=wearables" },
                  { name: "Gaming Gear", href: "/shop?category=gaming" },
                ].map((cat) => (
                  <Link
                    key={cat.name}
                    href={cat.href}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-sky-50 dark:bg-slate-800/60 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-slate-800 border border-sky-100 dark:border-slate-700 transition-colors"
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
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-sky-100/80 dark:border-slate-800 shadow-xs overflow-hidden">
                {/* Desktop Table Header */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Subtotal</div>
                </div>

                {/* Items List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => {
                    const product = item.product;
                    // The backend populates productId — extract the real product MongoDB _id
                    // product._id comes from mongoose populate; product.id is the virtual getter
                    const productId: string =
                      (product as any)?._id?.toString?.() ||
                      product?.id ||
                      "";
                    const isUpdating = updatingItemId === productId;
                    const isRemoving = removingItemId === productId;
                    const unitPrice = Number(product?.price) || 0;
                    const lineTotal = unitPrice * item.quantity;
                    const originalPrice = product?.originalPrice ? Number(product.originalPrice) : null;
                    const primaryCategory = product?.categories?.[0] || "Electronics";

                    return (
                      <div
                        key={item.id || productId}
                        className={`p-4 sm:p-6 transition-colors duration-200 ${
                          isRemoving ? "opacity-40 pointer-events-none" : "hover:bg-sky-50/20 dark:hover:bg-slate-800/30"
                        }`}
                      >
                        {/* Desktop Layout */}
                        <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                          {/* Product Info (Col 6) */}
                          <div className="col-span-6 flex items-center gap-4">
                            <Link
                              href={`/shop/${product?.slug || ""}`}
                              className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-sky-100/60 dark:border-slate-700 group cursor-pointer"
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
                              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                                {primaryCategory}
                              </span>
                              <Link
                                href={`/shop/${product?.slug || ""}`}
                                className="block font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-sky-600 dark:hover:text-sky-400 transition-colors line-clamp-2 mt-0.5"
                              >
                                {product?.title || "Unnamed Product"}
                              </Link>
                              <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                                  <CheckCircle2 className="w-3 h-3" /> In Stock
                                </span>
                                {product?.sku && (
                                  <span className="text-[11px]">SKU: {product.sku}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Unit Price (Col 2) */}
                          <div className="col-span-2 text-center">
                            <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                              ${unitPrice.toFixed(2)}
                            </div>
                            {originalPrice && originalPrice > unitPrice && (
                              <div className="text-xs text-slate-400 line-through">
                                ${originalPrice.toFixed(2)}
                              </div>
                            )}
                          </div>

                          {/* Quantity Controls (Col 2) */}
                          <div className="col-span-2 flex items-center justify-center">
                            <div className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 p-1 shadow-2xs">
                              <button
                                type="button"
                                disabled={item.quantity <= 1 || isUpdating}
                                onClick={() => handleQuantityChange(productId, item.quantity, -1)}
                                aria-label="Decrease quantity"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>

                              <span className="w-9 text-center text-xs font-bold text-slate-900 dark:text-white">
                                {isUpdating ? (
                                  <RefreshCw className="w-3 h-3 animate-spin mx-auto text-sky-500" />
                                ) : (
                                  item.quantity
                                )}
                              </span>

                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleQuantityChange(productId, item.quantity, 1)}
                                aria-label="Increase quantity"
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Line Total & Remove Button (Col 2) */}
                          <div className="col-span-2 flex items-center justify-end gap-3">
                            <span className="font-extrabold text-base text-sky-600 dark:text-sky-400">
                              ${lineTotal.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(productId, product?.title || "Item")}
                              aria-label="Remove item"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Mobile Responsive Layout */}
                        <div className="md:hidden flex gap-3.5">
                          <Link
                            href={`/shop/${product?.slug || ""}`}
                            className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-sky-100/60 dark:border-slate-700"
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
                                <span className="text-[9px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                                  {primaryCategory}
                                </span>
                                <Link
                                  href={`/shop/${product?.slug || ""}`}
                                  className="block font-bold text-xs text-slate-800 dark:text-slate-100 line-clamp-2 mt-0.5"
                                >
                                  {product?.title || "Unnamed Product"}
                                </Link>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(productId, product?.title || "Item")}
                                aria-label="Remove item"
                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="flex items-end justify-between mt-3">
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  ${unitPrice.toFixed(2)}
                                </span>
                                {item.quantity > 1 && (
                                  <span className="text-[10px] text-slate-400 ml-1.5 font-medium">
                                    Total: ${lineTotal.toFixed(2)}
                                  </span>
                                )}
                              </div>

                              <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800 p-0.5">
                                <button
                                  type="button"
                                  disabled={item.quantity <= 1 || isUpdating}
                                  onClick={() => handleQuantityChange(productId, item.quantity, -1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-7 text-center text-xs font-bold text-slate-900 dark:text-white">
                                  {isUpdating ? "..." : item.quantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={isUpdating}
                                  onClick={() => handleQuantityChange(productId, item.quantity, 1)}
                                  className="w-6 h-6 rounded flex items-center justify-center text-slate-600 dark:text-slate-300 disabled:opacity-30"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Table Bottom Controls Bar */}
                <div className="p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-2xs"
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
                    <AlertDialog.Backdrop isDismissable className="bg-black/60">
                      <AlertDialog.Container size="sm">
                        <AlertDialog.Dialog className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4">
                          {({ close }) => (
                            <>
                              <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/80 dark:border-rose-900/50">
                                  <Trash2 className="w-5 h-5" />
                                </div>
                                <div className="space-y-1">
                                  <AlertDialog.Heading className="text-base font-bold text-slate-900 dark:text-white">
                                    Clear Shopping Cart?
                                  </AlertDialog.Heading>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Are you sure you want to remove all items from your shopping cart? This action cannot be undone.
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onPress={close}
                                  isDisabled={isClearing}
                                  className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-xs"
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
              <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
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
                          {appliedCoupon.discountPercent
                            ? `${appliedCoupon.discountPercent}% off subtotal discount`
                            : appliedCoupon.discountAmount
                            ? `$${appliedCoupon.discountAmount} flat discount`
                            : "Free shipping activated"}
                        </p>
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
                        placeholder="Enter promo code (e.g. ELECTRO10, SAVE15)"
                        className="w-full h-11 px-4 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 uppercase"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isApplyingCoupon}
                      className="h-11 px-6 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm hover:shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50 shrink-0"
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

                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span>Available sample codes:</span>
                  <button
                    type="button"
                    onClick={() => setCouponCode("ELECTRO10")}
                    className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 text-sky-600 dark:text-sky-400 cursor-pointer font-bold"
                  >
                    ELECTRO10 (-10%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCouponCode("SAVE15")}
                    className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-sky-100 text-sky-600 dark:text-sky-400 cursor-pointer font-bold"
                  >
                    SAVE15 (-$15)
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right Column: Order Summary Card (4 cols) ── */}
            <div className="lg:col-span-4 flex flex-col gap-6 sticky top-24">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-sky-100/80 dark:border-slate-800 shadow-sm">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-slate-800">
                  Order Summary
                </h3>

                <div className="py-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
                  {/* Subtotal */}
                  <div className="flex items-center justify-between">
                    <span>Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Shipping */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="font-semibold text-slate-700 dark:text-slate-200">Standard Shipping</span>
                      <p className="text-[10px] text-slate-400">Estimated delivery in 3-5 business days</p>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {shippingCost === 0 ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                          FREE
                        </span>
                      ) : (
                        `$${shippingCost.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {/* Promo Code Discount */}
                  {discountValue > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span>Discount ({appliedCoupon?.code})</span>
                      <span>-${discountValue.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Grand Total */}
                  <div className="pt-4 border-t-2 border-slate-200 dark:border-slate-700 flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Estimated Total
                      </span>
                      <p className="text-[10px] text-slate-400">Includes applicable discounts & shipping</p>
                    </div>
                    <span className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Checkout CTA */}
                <div className="mt-6 space-y-3">
                  {isSuspended ? (
                    <button
                      type="button"
                      onClick={() => setShowSuspendedCheckoutAlert(true)}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md shadow-sky-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  ) : (
                    <Link
                      href={user ? "/checkout" : "/auth/login?callbackUrl=/checkout"}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md shadow-sky-500/25 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      Proceed to Checkout
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  )}

                  <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Guaranteed 256-bit Encrypted Checkout
                  </p>
                </div>

                {/* Trust Badges & Guarantees */}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Fast & Tracked Shipping</p>
                      <p className="text-[10px] text-slate-400">Free delivery on orders over $150</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">30-Day Hassle-Free Returns</p>
                      <p className="text-[10px] text-slate-400">Money back guarantee on all orders</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">Flexible Payment Options</p>
                      <p className="text-[10px] text-slate-400">Visa, Mastercard, Amex, PayPal</p>
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