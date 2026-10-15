"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getCartByUserId } from "@/lib/api/cart";
import { authClient } from "@/lib/auth-client";

interface CartButtonProps {
  /** When true, renders the current dollar total next to the bag icon (desktop navbar) */
  showTotal?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function CartButton({
  showTotal = false,
  className = "",
  onClick,
}: CartButtonProps) {
  // ── User Session ──────────────────────────────────────────────────────────
  const { data: session } = authClient.useSession();
  const user = session?.user;

  // ── Cart Badge State ──────────────────────────────────────────────────────
  const [count, setCount] = useState<number>(0);
  const [total, setTotal] = useState<string>("$0.00");

  // ── Reactive Cart Sync ────────────────────────────────────────────────────
  // Automatically loads cart when user logs in AND updates live whenever
  // a "cart-updated" event is dispatched anywhere in the app (e.g., add to cart, delete, clear).
  useEffect(() => {
    // Reset badge if user is not signed in
    if (!user?.id) {
      setCount(0);
      setTotal("$0.00");
      return;
    }

    // Function to fetch latest cart count and total price
    const loadCart = () => {
      getCartByUserId(user.id)
        .then((res) => {
          if (res?.success && res.data) {
            const totalItems = res.data.totalItems ?? res.data.itemCount ?? 0;
            const totalPrice = res.data.totalPrice ?? res.data.subtotal ?? 0;
            setCount(totalItems);
            setTotal(`$${Number(totalPrice).toFixed(2)}`);
          }
        })
        .catch(() => {});
    };

    // Initial fetch on mount / user change
    loadCart();

    // Listen for global custom event dispatched on cart modifications
    window.addEventListener("cart-updated", loadCart);
    return () => window.removeEventListener("cart-updated", loadCart);
  }, [user?.id]);

  return (
    <Link
      href={user ? "/cart" : "/auth/login?callbackUrl=/cart"}
      onClick={onClick}
      aria-label="Shopping Cart"
      className={`group relative flex items-center gap-1.5 text-gray-700 dark:text-gray-200 hover:text-primary transition-colors ${className}`}
    >
      <div className="relative p-0.5">
        <ShoppingCart className="w-5 h-5 stroke-[1.8]" />
        {/* Item count badge (only shown when authenticated) */}
        {Boolean(user) && (
          <span className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
            {count}
          </span>
        )}
      </div>

      {/* Optional subtotal price display */}
      {Boolean(user) && showTotal && (
        <span className="text-xs sm:text-sm font-bold text-[#333e48] dark:text-gray-100 group-hover:text-primary transition-colors whitespace-nowrap">
          {total}
        </span>
      )}
    </Link>
  );
}
