"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Card,
  Input,
  Button,
} from "@heroui/react";
import SuspendedAccountModal from "@/components/shared/SuspendedAccountModal";
import {
  ShoppingBag,
  ShieldCheck,
  Truck,
  ArrowLeft,
  ArrowRight,
  Lock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  User as UserIcon,
  Building,
  Hash,
  Smartphone,
  RefreshCw,
  Check,
  Sparkles,
  Coins,
  ChevronRight,
  Ban,
  Bookmark,
  Plus,
  Tag,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import { getCartByUserId } from "@/lib/api/cart";
import { createOrder } from "@/lib/action/orders";
import { checkCouponCode } from "@/lib/action/coupons";
import { saveAddress } from "@/lib/action/address";
import {
  CheckoutClientProps,
  CartData,
  CartItem,
  CouponQuote,
  PaymentMethod,
  ShippingAddress,
  SavedAddress,
} from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import WalletPaymentModal from "./WalletPaymentModal";
import {
  buildDemoTransactionId,
  buildDemoWalletPhone,
  isTransactionIdValid,
  isWalletPhoneValid,
  normaliseTransactionId,
  normaliseWalletPhone,
} from "@/lib/walletPayment";

// ── Loyalty Points Rates ────────────────────────────────────────────────────
// Same rules as the backend: 100 points = 1 currency unit, 100 to start.
const POINTS_PER_UNIT = 100;
const MIN_POINTS_TO_REDEEM = 100;

// ── Payment Methods Definition ──────────────────────────────────────────────
interface PaymentOption {
  id: PaymentMethod;
  name: string;
  subtitle: string;
  tag?: string;
  accentColor: string;
  bgActive: string;
  borderActive: string;
  gatewayColor: string;
  gatewayHeaderBg: string;
  brandButtonClass: string;
  brandBarClass: string;
  icon: React.ReactNode;
}

const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    id: "cod",
    name: "Cash on Delivery",
    subtitle: "Pay cash right at your doorstep upon arrival",
    tag: "No Advance Fee",
    accentColor: "text-emerald-600 dark:text-emerald-400",
    bgActive: "bg-emerald-50/70 dark:bg-emerald-950/30",
    borderActive: "border-emerald-500 dark:border-emerald-500 ring-1 ring-emerald-500/30",
    gatewayColor: "emerald",
    gatewayHeaderBg: "from-emerald-600 to-teal-700",
    brandButtonClass: "bg-emerald-600 hover:bg-emerald-700",
    brandBarClass: "bg-emerald-500",
    icon: <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  },
  {
    id: "bkash",
    name: "bKash Direct",
    subtitle: "Instant payment via bKash mobile wallet",
    tag: "Fast & Popular",
    accentColor: "text-pink-600 dark:text-pink-400",
    bgActive: "bg-pink-50/70 dark:bg-pink-950/30",
    borderActive: "border-pink-500 dark:border-pink-500 ring-1 ring-pink-500/30",
    gatewayColor: "pink",
    gatewayHeaderBg: "from-[#D81B60] via-[#E2136E] to-[#C2185B]",
    brandButtonClass: "bg-[#E2136E] hover:bg-[#C2185B]",
    brandBarClass: "bg-[#E2136E]",
    icon: <Smartphone className="w-5 h-5 text-pink-600 dark:text-pink-400" />,
  },
  {
    id: "nagad",
    name: "Nagad Wallet",
    subtitle: "Quick settlement through Nagad payment gateway",
    tag: "Instant 0% Fee",
    accentColor: "text-orange-600 dark:text-orange-400",
    bgActive: "bg-orange-50/70 dark:bg-orange-950/30",
    borderActive: "border-orange-500 dark:border-orange-500 ring-1 ring-orange-500/30",
    gatewayColor: "orange",
    gatewayHeaderBg: "from-[#F7941D] via-[#EA580C] to-[#C2410C]",
    brandButtonClass: "bg-[#F7941D] hover:bg-[#EA580C]",
    brandBarClass: "bg-[#F7941D]",
    icon: <CreditCard className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
  },
  {
    id: "rocket",
    name: "Rocket (DBBL)",
    subtitle: "Dutch-Bangla Bank Rocket mobile banking",
    tag: "Secure DBBL",
    accentColor: "text-purple-600 dark:text-purple-400",
    bgActive: "bg-purple-50/70 dark:bg-purple-950/30",
    borderActive: "border-purple-500 dark:border-purple-500 ring-1 ring-purple-500/30",
    gatewayColor: "purple",
    gatewayHeaderBg: "from-[#8C3494] via-[#7B1FA2] to-[#6A1B9A]",
    brandButtonClass: "bg-[#8C3494] hover:bg-[#7B1FA2]",
    brandBarClass: "bg-[#8C3494]",
    icon: <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
  },
];

export default function CheckoutClient({
  initialCart,
  user: initialUser,
  savedAddresses = [],
  initialCouponCode,
}: CheckoutClientProps) {
  const router = useRouter();
  const { data: clientSession } = authClient.useSession();
  const user = initialUser || clientSession?.user;
  const isSuspended = ((user as { status?: string })?.status || "").toLowerCase() === "suspended";
  const [showSuspendedAlert, setShowSuspendedAlert] = useState<boolean>(false);

  // ── Cart State ─────────────────────────────────────────────────────────────
  const [cart, setCart] = useState<CartData | null>(initialCart || null);
  const [isCartLoading, setIsCartLoading] = useState<boolean>(
    !initialCart && Boolean(user?.id)
  );

  // ── Saved Address Book ─────────────────────────────────────────────────────
  // The server sends the book with the default address first, so a returning
  // customer starts with the form already filled in.
  const addressBook: SavedAddress[] = savedAddresses;

  // ── Shipping Form State ────────────────────────────────────────────────────
  const [shippingForm, setShippingForm] = useState<ShippingAddress>(() => {
    const preferred = addressBook[0];
    if (preferred) {
      return {
        fullName: preferred.fullName || user?.name || "",
        phone: preferred.phone,
        address: preferred.address,
        city: preferred.city,
        postalCode: preferred.postalCode,
      };
    }

    return { fullName: user?.name || "", phone: "", address: "", city: "", postalCode: "" };
  });

  // `"new"` means the form holds an address that is not in the book.
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addressBook[0]?._id ?? "new"
  );
  // Only asked for an address that is not saved yet.
  const [saveForNextTime, setSaveForNextTime] = useState<boolean>(true);

  // ── Payment Selection State ────────────────────────────────────────────────
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cod");

  // ── Wallet Verification State (React useState ONLY - session only) ─────────
  // Phone number + TrxID typed by the customer (demo flow, nothing is sent away)
  const [walletPhone, setWalletPhone] = useState<string>("");
  const [walletTransactionId, setWalletTransactionId] = useState<string>("");
  const [isWalletVerified, setIsWalletVerified] = useState<boolean>(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);

  // ── Reward Points State ────────────────────────────────────────────────────
  // The customer only chooses whether to spend points; the amount is worked
  // out from their balance and the cart subtotal.
  const [useRewardPoints, setUseRewardPoints] = useState<boolean>(false);

  // ── Discount Code State ────────────────────────────────────────────────────
  // The code is the cart's, but the number is the API's. Nothing here is a
  // locally multiplied percentage.
  const [coupon, setCoupon] = useState<CouponQuote | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isCheckingCoupon, setIsCheckingCoupon] = useState<boolean>(false);
  // One quiet re-price per incoming code, not one per keystroke of the render.
  const pricedIncomingCode = useRef<string | null>(null);

  // ── Order Placement State ──────────────────────────────────────────────────
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);

  // Fetch cart data when user is available or on mount
  useEffect(() => {
    const fetchUserCart = async () => {
      if (!user?.id || cart) return;
      try {
        setIsCartLoading(true);
        const res = await getCartByUserId(user.id);
        if (res?.success && res.data) {
          setCart(res.data);
        }
      } catch (err) {
        console.error("Error fetching cart for checkout:", err);
      } finally {
        setIsCartLoading(false);
      }
    };

    fetchUserCart();
  }, [user?.id, cart]);

  // Derived Calculations
  const items: CartItem[] = cart?.items || [];
  const itemCount = items.reduce((acc, item) => acc + (item.quantity || 0), 0);
  const subtotal = useMemo(() => {
    return items.reduce(
      (acc, item) =>
        acc + (Number(item.product?.price) || 0) * (item.quantity || 0),
      0
    );
  }, [items]);

  const { settings, formatPrice } = useSiteSettings();
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<"standard" | "express">("standard");

  const standardShippingCost = settings.shipping?.standardDeliveryFee ?? 15.0;
  const expressShippingCost = settings.shipping?.expressDeliveryFee ?? 25.0;
  const estimatedDays = settings.shipping?.estimatedDeliveryDays || "2-4 business days";
  const freeShippingThreshold = settings.shipping?.freeShippingThreshold ?? 50.0;
  const isFreeShippingEnabled = settings.shipping?.freeShippingEnabled !== false;

  const isFreeShippingEligible = isFreeShippingEnabled && subtotal >= freeShippingThreshold;

  const shippingCost = useMemo(() => {
    if (subtotal === 0) return 0.0;
    if (selectedShippingMethod === "express") {
      return expressShippingCost;
    }
    return isFreeShippingEligible ? 0.0 : standardShippingCost;
  }, [subtotal, selectedShippingMethod, isFreeShippingEligible, expressShippingCost, standardShippingCost]);

  // ── Loyalty Points ─────────────────────────────────────────────────────────
  // The session user carries the live balance (see lib/auth.ts).
  const userPoints =
    Number((user as { points?: number | null } | null)?.points) || 0;
  const availablePoints = Math.max(0, Math.floor(userPoints));

  // The coupon comes off the subtotal first; loyalty points may then only cover
  // what the code left to pay for; the shipping fee is added on top. This is the
  // same order the backend prices in, so the screen and the charge agree.
  const couponDiscount = coupon?.discount ?? 0;
  /** Below the subtotal whenever a shop's code only covers its own lines. */
  const coveredByCoupon = coupon?.eligibleSubtotal ?? 0;
  const payableSubtotal = Math.max(0, subtotal - couponDiscount);

  // Points pay for products only, so the cap is what is left of the subtotal
  // in points - and never more than the customer actually owns.
  const maxRedeemablePoints = Math.min(
    availablePoints,
    Math.floor(payableSubtotal) * POINTS_PER_UNIT
  );
  const canRedeemPoints = maxRedeemablePoints >= MIN_POINTS_TO_REDEEM;
  const pointsToRedeem =
    useRewardPoints && canRedeemPoints ? maxRedeemablePoints : 0;
  const pointsDiscount = pointsToRedeem / POINTS_PER_UNIT;
  // Points are earned on what is really paid for the products.
  const pointsEarned = Math.floor(payableSubtotal - pointsDiscount);

  const grandTotal = Math.max(0, payableSubtotal + shippingCost - pointsDiscount);
  const isCartEmpty = items.length === 0;

  // The lines the API needs in order to price a code: ids and quantities only.
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

  // A code that arrived from the cart is checked once, as soon as the basket is
  // on screen. If it no longer holds, the reason is shown and the order simply
  // goes at full price - the shopper is never quietly charged the old discount.
  useEffect(() => {
    const code = initialCouponCode?.trim().toUpperCase();
    if (!code || items.length === 0) return;
    if (pricedIncomingCode.current === code) return;
    pricedIncomingCode.current = code;

    let cancelled = false;
    const priceIncomingCode = async () => {
      setIsCheckingCoupon(true);
      try {
        const res = await checkCouponCode(code, basketLines());
        if (cancelled) return;

        if (res?.success === false) {
          setCoupon(null);
          setCouponError(res.message || "That code no longer applies to this order");
          return;
        }

        const quote = (res as { data?: CouponQuote } | null)?.data;
        if (!quote) {
          setCoupon(null);
          setCouponError("That code could not be re-checked just now");
          return;
        }

        setCoupon(quote);
        setCouponError(null);
      } catch (err) {
        if (cancelled) return;
        setCoupon(null);
        setCouponError((err as Error).message || "That code could not be re-checked");
      } finally {
        if (!cancelled) setIsCheckingCoupon(false);
      }
    };

    priceIncomingCode();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCouponCode, items.length]);

  // Validation: Shipping form must have all required fields for every payment method
  const isShippingValid = useMemo(() => {
    return (
      shippingForm.fullName.trim().length > 1 &&
      shippingForm.phone.trim().length >= 6 &&
      shippingForm.address.trim().length >= 3 &&
      shippingForm.city.trim().length >= 2 &&
      shippingForm.postalCode.trim().length >= 2
    );
  }, [shippingForm]);

  // Validation: Payment requirement
  // If COD: ready once shipping is valid
  // If wallet: phone + TrxID must pass the demo gateway check
  const isPaymentValid = useMemo(() => {
    if (selectedPaymentMethod === "cod") return true;
    return isWalletVerified && Boolean(walletTransactionId);
  }, [selectedPaymentMethod, isWalletVerified, walletTransactionId]);

  // The Verify button only wakes up once both fields look like real wallet data.
  const isWalletDetailsValid =
    isWalletPhoneValid(walletPhone) && isTransactionIdValid(walletTransactionId);

  // While the incoming code is being re-priced the totals on screen are not the
  // final ones, so the button waits a moment rather than quoting a stale number.
  const isCheckoutReady =
    !isCartEmpty && isShippingValid && isPaymentValid && !isPlacingOrder && !isCheckingCoupon;

  const currentPaymentOption =
    PAYMENT_OPTIONS.find((opt) => opt.id === selectedPaymentMethod) ||
    PAYMENT_OPTIONS[0];

  // TrxID placeholder so the demo looks like the SMS the wallet really sends.
  const transactionIdPlaceholder =
    selectedPaymentMethod === "rocket" ? "12 digit TrxID" : "e.g. 9F2K7LM4QZ";

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Reset wallet verification state when user switches payment method
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    if (method !== selectedPaymentMethod) {
      setSelectedPaymentMethod(method);
      // Reset wallet details so one wallet's payment can't verify another wallet
      setWalletPhone("");
      setWalletTransactionId("");
      setIsWalletVerified(false);
      setIsPaymentModalOpen(false);
    }
  };

  const handleShippingChange = (
    field: keyof ShippingAddress,
    value: string
  ) => {
    setShippingForm((prev) => ({ ...prev, [field]: value }));
    // Typing means the form no longer matches a saved address exactly.
    setSelectedAddressId("new");
  };

  // Copy one saved address into the form, or switch back to a blank entry.
  const handlePickAddress = (id: string) => {
    if (id === "new") {
      setSelectedAddressId("new");
      return;
    }

    const picked = addressBook.find((item) => item._id === id);
    if (!picked) return;

    setShippingForm({
      fullName: picked.fullName,
      phone: picked.phone,
      address: picked.address,
      city: picked.city,
      postalCode: picked.postalCode,
    });
    setSelectedAddressId(picked._id);
  };

  // 1. Validate the typed wallet number + TrxID, then open the gateway modal.
  const handleStartWalletVerification = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }

    if (!isWalletPhoneValid(walletPhone)) {
      toast.error("Enter a valid 11-digit mobile number, e.g. 01712345678");
      return;
    }

    if (!isTransactionIdValid(walletTransactionId)) {
      toast.error("Enter the TrxID from your wallet SMS (8-20 letters or digits)");
      return;
    }

    setIsWalletVerified(false);
    setIsPaymentModalOpen(true);
  };

  // 2. Demo shortcut: fill both fields with realistic values and run the gateway.
  const handleDemoAutoFill = () => {
    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }

    // Reuse what the customer typed, then the shipping phone, then invent one.
    const shippingPhone = normaliseWalletPhone(shippingForm.phone);
    let phone = walletPhone;

    if (!isWalletPhoneValid(phone)) {
      phone = isWalletPhoneValid(shippingPhone) ? shippingPhone : buildDemoWalletPhone();
    }

    setWalletPhone(phone);
    setWalletTransactionId(buildDemoTransactionId(selectedPaymentMethod));
    setIsWalletVerified(false);
    setIsPaymentModalOpen(true);
  };

  // The gateway modal finished its checks - remember that this payment went through.
  const handleWalletPaymentSuccess = useCallback(() => {
    setIsWalletVerified(true);
  }, []);

  // 3. Start over (wrong TrxID, wrong number, ...)
  const handleResetWalletVerification = () => {
    setWalletTransactionId("");
    setIsWalletVerified(false);
    setIsPaymentModalOpen(false);
  };

  // 4. Place Order — calls real backend POST /api/orders
  const handlePlaceOrder = async () => {
    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }

    if (isCartEmpty) {
      toast.error("Your cart is empty. Add items before placing an order.");
      return;
    }

    if (!isShippingValid) {
      toast.error("Please complete all required shipping address fields.");
      return;
    }

    if (selectedPaymentMethod !== "cod" && !isWalletVerified) {
      toast.error("Please complete mobile wallet verification before placing order.");
      return;
    }

    setIsPlacingOrder(true);

    const orderData = {
      items: items.map((item) => ({
        productId:
          (item.product?.id ||
            (item.product as unknown as { _id?: string })?._id ||
            item.id) as string,
        quantity: item.quantity,
        title: item.product?.title || "",
        price: Number(item.product?.price || 0),
        image: item.product?.image || "",
      })),
      shippingAddress: {
        fullName: shippingForm.fullName.trim(),
        phone: shippingForm.phone.trim(),
        address: shippingForm.address.trim(),
        city: shippingForm.city.trim(),
        postalCode: shippingForm.postalCode.trim(),
      },
      paymentMethod: selectedPaymentMethod,
      shippingMethod: (isFreeShippingEligible
        ? "free"
        : selectedShippingMethod) as "free" | "standard" | "express",
      ...(selectedPaymentMethod !== "cod"
        ? { transactionId: normaliseTransactionId(walletTransactionId) }
        : {}),
      ...(pointsToRedeem > 0 ? { pointsToRedeem } : {}),
      ...(coupon ? { couponCode: coupon.code } : {}),
    };

    try {
      const response = await createOrder(orderData);

      // The backend returns { success, data: <order document>, message }
      const createdOrder = response?.data as { _id: string } | undefined;
      if (!createdOrder?._id) {
        throw new Error("Order couldn't be placed..Please check cart!");
      }

      // Keep the address for the next order. This runs before the redirect, but
      // a failure here is only logged: the order itself is already placed.
      if (user?.id && saveForNextTime && selectedAddressId === "new") {
        try {
          const saved = await saveAddress({
            fullName: shippingForm.fullName.trim(),
            phone: shippingForm.phone.trim(),
            address: shippingForm.address.trim(),
            city: shippingForm.city.trim(),
            postalCode: shippingForm.postalCode.trim(),
          });

          // Most likely reason: the book is already full (5 addresses).
          if (saved?.success === false) {
            toast.warning(saved?.message || "This address could not be saved.");
          }
        } catch (err) {
          console.error("Could not save the shipping address:", err);
        }
      }

      toast.success("Order placed successfully! Redirecting...");
      router.push(`/order-success/${createdOrder._id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to place order. Please try again.";
      toast.error(msg);
      console.error("Order placement error:", err);
      setIsPlacingOrder(false);
    }
  };

  // ── Common Styling Classes ──────────────────────────────────────────────────
  const cardClass =
    "border border-[var(--border-color)] shadow-sm bg-[var(--surface)] rounded-2xl";
  const labelClass = "text-xs font-semibold text-[var(--foreground)]";
  const fieldClass = "flex flex-col gap-1.5";
  const sectionHeadingClass =
    "text-base font-bold text-[var(--foreground)] flex items-center gap-2";

  return (
    <>
    <SuspendedAccountModal
      isOpen={showSuspendedAlert}
      onOpenChange={setShowSuspendedAlert}
      message="Your account has been suspended. You cannot place orders or proceed with checkout. Please contact customer support for assistance."
    />

    <div className="py-6 md:py-10 space-y-6">
      {/* ── Suspension Notice Banner ── */}
      {isSuspended && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center gap-3.5 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800">
            <Ban className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-red-900 dark:text-red-200">
              Account Suspended
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
              Your account has been suspended by administration. Checkout and order placement actions are disabled.
            </p>
          </div>
          <Button
            size="sm"
            onPress={() => setShowSuspendedAlert(true)}
            className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 shrink-0"
          >
            Details
          </Button>
        </div>
      )}

      {/* ── Breadcrumbs & Page Header ── */}
      <div className="space-y-2">
        <nav className="flex items-center gap-2 text-xs text-[var(--foreground-muted)]">
          <Link
            href="/"
            className="hover:text-primary transition-colors"
          >
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href="/cart"
            className="hover:text-primary transition-colors"
          >
            Shopping Cart
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-[var(--foreground)]">
            Checkout
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              Secure{" "}
              <span className="text-gradient-primary">
                Checkout
              </span>
            </h1>
            <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-0.5">
              Review your delivery details and choose your preferred payment option.
            </p>
          </div>

          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover bg-primary/10 px-3.5 py-2 rounded-xl border border-primary/20 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Cart
          </Link>
        </div>
      </div>

      {/* ── Empty Cart State ── */}
      {isCartEmpty && !isCartLoading ? (
        <Card className={cardClass}>
          <Card.Content className="p-8 md:p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-lg md:text-xl font-bold text-[var(--foreground)]">
                Your Shopping Cart is Empty
              </h2>
              <p className="text-xs md:text-sm text-[var(--foreground-muted)]">
                You haven&apos;t added any items to your cart yet. Explore our wide
                range of products to continue checkout.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
              >
                Explore Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card.Content>
        </Card>
      ) : (
        /* ── Two-Column Layout (Matching AddProductClient 2/3 + 1/3) ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ════════════════════════════════════════════════════════
              LEFT COLUMN (Spans 2 of 3 Columns)
          ════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* ── 1. Payment Method Section ── */}
            <Card className={cardClass}>
              <Card.Content className="p-5 sm:p-6 md:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <h2 className={sectionHeadingClass}>
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span>{selectedPaymentMethod === "cod" ? "1. Payment Method" : "Payment Method"}</span>
                  </h2>
                  <span className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                    Select payment option
                  </span>
                </div>

                {/* Selectable Payment Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const isSelected = selectedPaymentMethod === opt.id;
                    return (
                      <div
                        key={opt.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handlePaymentMethodChange(opt.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            handlePaymentMethodChange(opt.id);
                          }
                        }}
                        className={`relative p-4 rounded-xl border transition-all cursor-pointer text-left flex flex-col justify-between gap-3 select-none ${
                          isSelected
                            ? `${opt.bgActive} ${opt.borderActive} shadow-sm`
                            : "bg-[var(--surface-alt)] border-[var(--border-color)] hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-[var(--surface)] border border-[var(--border-color)] flex items-center justify-center shadow-2xs shrink-0">
                              {opt.icon}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-[var(--foreground)]">
                                {opt.name}
                              </p>
                              <p className="text-[10px] text-[var(--foreground-muted)] leading-tight mt-0.5">
                                {opt.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Custom Radio Pill */}
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-white"
                                : "border-[var(--border-color)] bg-[var(--surface)]"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        {opt.tag && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-[var(--surface)] border border-[var(--border-color)] text-[var(--foreground)]">
                              {opt.tag}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Conditional Payment Info & Wallet Verification Block ── */}
                {selectedPaymentMethod === "cod" ? (
                  /* Cash on Delivery Notice */
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50 flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Coins className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 text-xs">
                      <p className="font-bold text-emerald-900 dark:text-emerald-200">
                        Cash on Delivery Selected
                      </p>
                      <p className="text-emerald-700/90 dark:text-emerald-300/80 text-[11px]">
                        No advance payment or wallet verification required. Please provide your shipping address below for courier delivery.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Mobile Wallet Entry Block */
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2.5 text-xs text-primary">
                      <Sparkles className="w-4 h-4 shrink-0 text-primary" />
                      <span>
                        <strong>Instant Digital Checkout:</strong> Please complete your shipping address below — it is required for {currentPaymentOption.name} orders too.
                      </span>
                    </div>

                    <div className="p-4 sm:p-5 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-primary" />
                          <h3 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                            {selectedPaymentMethod.toUpperCase()} Payment Verification
                          </h3>
                        </div>
                        {isWalletVerified ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Payment Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Verification Pending
                          </span>
                        )}
                      </div>

                      {/* Wallet number + TrxID - the two details a real wallet receipt shows */}
                      <form onSubmit={handleStartWalletVerification} className="space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className={fieldClass}>
                            <label className={labelClass}>Wallet Mobile Number</label>
                            <div className="relative">
                              <Input
                                type="tel"
                                inputMode="numeric"
                                placeholder="01XXXXXXXXX"
                                value={walletPhone}
                                onChange={(e) => setWalletPhone(normaliseWalletPhone(e.target.value))}
                                disabled={isWalletVerified}
                                className="w-full"
                              />
                              <Smartphone className="w-4 h-4 text-[var(--foreground-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>

                          <div className={fieldClass}>
                            <label className={labelClass}>Transaction ID (TrxID)</label>
                            <div className="relative">
                              <Input
                                type="text"
                                placeholder={transactionIdPlaceholder}
                                value={walletTransactionId}
                                onChange={(e) => setWalletTransactionId(normaliseTransactionId(e.target.value))}
                                disabled={isWalletVerified}
                                className="w-full font-mono"
                              />
                              <Hash className="w-4 h-4 text-[var(--foreground-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          </div>
                        </div>

                        <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
                          Pay with your {currentPaymentOption.name} app first, then paste the TrxID from
                          the confirmation SMS. No real money moves here - press{" "}
                          <strong>Use demo payment</strong> to fill both fields and run the gateway.
                        </p>

                        {!isWalletVerified && (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              type="button"
                              onPress={handleDemoAutoFill}
                              className="h-10 flex-1 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-950/70 text-amber-900 dark:text-amber-200 font-bold text-xs rounded-xl border border-amber-300 dark:border-amber-800/70 transition-colors"
                            >
                              <span className="flex items-center justify-center gap-1.5">
                                <Sparkles className="w-4 h-4" />
                                Use demo payment
                              </span>
                            </Button>

                            <Button
                              type="submit"
                              isDisabled={!isWalletDetailsValid}
                              className="h-10 flex-1 bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                            >
                              <span className="flex items-center justify-center gap-1.5">
                                <Lock className="w-4 h-4" />
                                Verify Payment
                              </span>
                            </Button>
                          </div>
                        )}
                      </form>

                      {/* Verified State Banner */}
                      {isWalletVerified && (
                        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                Payment Authenticated & Ready
                              </p>
                              <p className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                                TrxID {walletTransactionId} - {walletPhone}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleResetWalletVerification}
                            className="text-[11px] font-semibold text-[var(--foreground-muted)] hover:text-rose-600 dark:text-[var(--foreground-muted)] dark:hover:text-rose-400 underline cursor-pointer"
                          >
                            Re-verify
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>

            {/* ── 2. Shipping Address Section (Required for every payment method) ── */}
            <Card className={cardClass}>
              <Card.Content className="p-5 sm:p-6 md:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <h2 className={sectionHeadingClass}>
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span>2. Shipping & Delivery Address</span>
                  </h2>
                  <span className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                    Required <span className="text-rose-500">*</span>
                  </span>
                </div>

                {/* Saved addresses: shown only when the customer has some. */}
                {user?.id && addressBook.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--foreground-muted)]">
                      Use a saved address
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {addressBook.map((item) => {
                        const isActive = selectedAddressId === item._id;
                        return (
                          <button
                            key={item._id}
                            type="button"
                            onClick={() => handlePickAddress(item._id)}
                            className={`text-left px-3 py-2 rounded-xl border transition-all cursor-pointer max-w-[220px] ${
                              isActive
                                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                                : "border-[var(--border-color)] bg-[var(--surface-alt)] hover:border-primary/50"
                            }`}
                          >
                            <span className={`flex items-center gap-1.5 text-xs font-bold ${isActive ? "text-primary" : "text-[var(--foreground)]"}`}>
                              <Bookmark className="w-3.5 h-3.5" />
                              {item.label}
                              {item.isDefault && (
                                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                                  Default
                                </span>
                              )}
                            </span>
                            <span className="block text-[11px] text-[var(--foreground-muted)] truncate">
                              {item.address}, {item.city}
                            </span>
                          </button>
                        );
                      })}

                      {/* Escape hatch: type an address that is not in the book. */}
                      <button
                        type="button"
                        onClick={() => handlePickAddress("new")}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                          selectedAddressId === "new"
                            ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                            : "border-[var(--border-color)] bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:border-primary/50"
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        New address
                      </button>
                    </div>
                  </div>
                )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className={fieldClass}>
                      <label className={labelClass}>
                        Full Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          name="fullName"
                          placeholder="e.g. John Doe"
                          value={shippingForm.fullName}
                          onChange={(e) =>
                            handleShippingChange("fullName", e.target.value)
                          }
                          className="w-full"
                          required
                        />
                        <UserIcon className="w-4 h-4 text-[var(--foreground-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div className={fieldClass}>
                      <label className={labelClass}>
                        Contact Phone <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          name="phone"
                          type="tel"
                          placeholder="e.g. +880 1712 345678"
                          value={shippingForm.phone}
                          onChange={(e) =>
                            handleShippingChange("phone", e.target.value)
                          }
                          className="w-full"
                          required
                        />
                        <Phone className="w-4 h-4 text-[var(--foreground-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* Street Address */}
                    <div className={`${fieldClass} sm:col-span-2`}>
                      <label className={labelClass}>
                        Street Address / House / Flat <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          name="address"
                          placeholder="e.g. House 42, Road 11, Block D, Banani"
                          value={shippingForm.address}
                          onChange={(e) =>
                            handleShippingChange("address", e.target.value)
                          }
                          className="w-full"
                          required
                        />
                        <Building className="w-4 h-4 text-[var(--foreground-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>

                    {/* City */}
                    <div className={fieldClass}>
                      <label className={labelClass}>
                        City / District <span className="text-rose-500">*</span>
                      </label>
                      <Input
                        name="city"
                        placeholder="e.g. Dhaka"
                        value={shippingForm.city}
                        onChange={(e) =>
                          handleShippingChange("city", e.target.value)
                        }
                        className="w-full"
                        required
                      />
                    </div>

                    {/* Postal Code */}
                    <div className={fieldClass}>
                      <label className={labelClass}>
                        Postal / ZIP Code <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          name="postalCode"
                          placeholder="e.g. 1213"
                          value={shippingForm.postalCode}
                          onChange={(e) =>
                            handleShippingChange("postalCode", e.target.value)
                          }
                          className="w-full"
                          required
                        />
                        <Hash className="w-4 h-4 text-[var(--foreground-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                {/** Offer to keep the address. Only for a new one: an address that
                    was picked from the book is already saved. */}
                {user?.id && selectedAddressId === "new" && (
                  <label className="flex items-start gap-2.5 p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={saveForNextTime}
                      onChange={(e) => setSaveForNextTime(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-[var(--foreground)]">
                        Save this address for next time
                      </span>
                      <span className="block text-[11px] text-[var(--foreground-muted)] mt-0.5">
                        It is kept in your account, so the next order is one tap. Up to 5
                        addresses can be saved and you can remove them from your profile.
                      </span>
                    </span>
                  </label>
                )}
                </Card.Content>
              </Card>

            {/* ── 3. Delivery Method Selection (Dynamic from Site Settings) ── */}
            <Card className={cardClass}>
              <Card.Content className="p-5 sm:p-6 md:p-7 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <h2 className={sectionHeadingClass}>
                    <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Truck className="w-4 h-4" />
                    </div>
                    <span>Delivery Option</span>
                  </h2>
                  <span className="text-[11px] font-semibold text-[var(--foreground-muted)]">
                    Choose delivery speed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Standard Delivery — auto-free when threshold met, otherwise selectable */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedShippingMethod("standard")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedShippingMethod("standard");
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-2.5 select-none cursor-pointer ${
                      isFreeShippingEligible
                        ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60"
                        : selectedShippingMethod === "standard"
                          ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                          : "bg-[var(--surface-alt)] border-[var(--border-color)] hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-[var(--foreground-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2" />
                            <path d="M14 18H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8" />
                            <circle cx="6" cy="18" r="2" />
                            <circle cx="18" cy="18" r="2" />
                          </svg>
                          <p className="text-xs font-bold text-[var(--foreground)]">Standard Delivery</p>
                          {isFreeShippingEligible && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20">
                              FREE
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">{estimatedDays}</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          selectedShippingMethod === "standard"
                            ? "border-primary bg-primary text-white"
                            : "border-[var(--border-color)] bg-[var(--surface)]"
                        }`}
                      >
                        {selectedShippingMethod === "standard" && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--foreground-muted)] font-medium">Fee:</span>
                      <span className="text-xs font-bold">
                        {isFreeShippingEligible ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">FREE</span>
                        ) : (
                          formatPrice(standardShippingCost)
                        )}
                      </span>
                    </div>
                    {isFreeShippingEligible && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        Auto-applied — order threshold met
                      </span>
                    )}
                  </div>

                  {/* Express Delivery — always available, pay to upgrade */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedShippingMethod("express")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedShippingMethod("express");
                      }
                    }}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 select-none ${
                      selectedShippingMethod === "express"
                        ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20"
                        : "bg-[var(--surface-alt)] border-[var(--border-color)] hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4.5 16.5c3 0 7.5-1.5 9.5-4.5l3 3" />
                            <path d="M19.5 13.5a2.5 2.5 0 1 0 3.5 3.5 2.5 2.5 0 0 0-3.5-3.5Z" />
                            <path d="M13.5 6.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z" />
                            <path d="M16 10a3 3 0 0 1 0 6" />
                            <path d="M8 14a3 3 0 0 1 0-6" />
                            <path d="M4.5 16.5 9 12" />
                          </svg>
                          <p className="text-xs font-bold text-[var(--foreground)]">Express Priority</p>
                          <span className="text-[9px] font-bold px-1.5 py-0.2 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">Fast</span>
                        </div>
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-0.5">1-2 business days</p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          selectedShippingMethod === "express"
                            ? "border-primary bg-primary text-white"
                            : "border-[var(--border-color)] bg-[var(--surface)]"
                        }`}
                      >
                        {selectedShippingMethod === "express" && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between">
                      <span className="text-[10px] text-[var(--foreground-muted)] font-medium">Fee:</span>
                      <span className="text-xs font-bold text-primary">
                        {formatPrice(expressShippingCost)}
                      </span>
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════
              RIGHT COLUMN (Order Summary Sidebar - Sticky)
          ════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
            <Card className={cardClass}>
              <Card.Content className="p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                  <h3 className="text-base font-extrabold text-[var(--foreground)] flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-primary" />
                    Order Summary
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {itemCount} {itemCount === 1 ? "Item" : "Items"}
                  </span>
                </div>

                {/* Item List Scroll Area */}
                <div className="max-h-72 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100 dark:divide-slate-800/80">
                  {items.map((item, idx) => {
                    const productTitle =
                      item.product?.title || `Product #${idx + 1}`;
                    const productPrice = Number(item.product?.price) || 0;
                    const productImage =
                      item.product?.image || "/placeholder.png";
                    const lineTotal =
                      item.lineTotal ?? productPrice * (item.quantity || 1);

                    return (
                      <div
                        key={item.id || item.product?.id || idx}
                        className="pt-3 first:pt-0 flex items-center gap-3"
                      >
                        <div className="relative w-12 h-12 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface)] overflow-hidden shrink-0 border border-[var(--border-color)]/80 dark:border-[var(--border-color)]">
                          <Image
                            src={productImage}
                            alt={productTitle}
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized={productImage.startsWith("http")}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[var(--foreground)] truncate">
                            {productTitle}
                          </p>
                          <p className="text-[11px] text-[var(--foreground-muted)]">
                            Qty: {item.quantity} × {formatPrice(productPrice)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-[var(--foreground)]">
                            {formatPrice(lineTotal)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Reward Points ── spend the loyalty balance on this order */}
                {availablePoints > 0 && (
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] p-3">
                    <label
                      className={`flex items-start gap-2.5 ${
                        canRedeemPoints ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={useRewardPoints && canRedeemPoints}
                        disabled={!canRedeemPoints}
                        onChange={(e) => setUseRewardPoints(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)]">
                          <Coins className="w-3.5 h-3.5 text-amber-500" />
                          Use my reward points
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--foreground-muted)]">
                          {canRedeemPoints
                            ? `Save ${formatPrice(maxRedeemablePoints / POINTS_PER_UNIT)} with ${maxRedeemablePoints} points`
                            : `Collect ${MIN_POINTS_TO_REDEEM}+ points and keep products in the cart`}
                        </span>
                      </span>
                    </label>
                    <p className="mt-2 text-[10px] text-[var(--foreground-muted)]">
                      Balance: {availablePoints} pts &middot; 100 pts ={" "}
                      {formatPrice(1)}
                    </p>
                  </div>
                )}

                {/* Price Breakdown */}
                <div className="pt-4 border-t border-[var(--border-color)] space-y-2.5 text-xs text-[var(--foreground-secondary)] dark:text-[var(--foreground-secondary)]">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900 dark:text-[var(--foreground)]">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {/* The code the cart brought, priced again by the API */}
                  {initialCouponCode && isCheckingCoupon && (
                    <p className="flex items-center gap-1 text-[10px] text-[var(--foreground-muted)]">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Checking {initialCouponCode} against these items...
                    </p>
                  )}

                  {couponDiscount > 0 && coupon && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1 min-w-0">
                        <Tag className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{coupon.code}</span>
                        {coveredByCoupon < subtotal && (
                          <span className="text-[10px] text-[var(--foreground-muted)]">
                            ({formatPrice(coveredByCoupon)} of this basket)
                          </span>
                        )}
                      </span>
                      <span className="font-bold">
                        -{formatPrice(couponDiscount)}
                      </span>
                    </div>
                  )}

                  {/* A code that no longer holds says so, and the order is full price */}
                  {initialCouponCode && couponError && (
                    <p className="flex items-start gap-1 text-[10px] text-red-600 dark:text-red-400">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <span className="font-bold">{initialCouponCode}</span>{" "}
                        — {couponError}
                      </span>
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span>
                        {isFreeShippingEligible
                          ? "Free Shipping"
                          : selectedShippingMethod === "express"
                            ? "Express Priority"
                            : "Standard Shipping"}
                      </span>
                      <span className="text-[10px] text-[var(--foreground-muted)]">
                        ({isFreeShippingEligible ? "auto-applied" : selectedShippingMethod === "express" ? "1-2 business days" : estimatedDays})
                      </span>
                    </div>
                    <span>
                      {shippingCost === 0 ? (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          FREE
                        </span>
                      ) : (
                        formatPrice(shippingCost)
                      )}
                    </span>
                  </div>

                  {/* Points spent on this order - only shown when used */}
                  {pointsDiscount > 0 && (
                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span>Reward points ({pointsToRedeem} pts)</span>
                      <span className="font-bold">
                        -{formatPrice(pointsDiscount)}
                      </span>
                    </div>
                  )}

                  {shippingCost > 0 && isFreeShippingEnabled && selectedShippingMethod === "standard" && (
                    <p className="text-[10px] text-primary">
                      Add {formatPrice(freeShippingThreshold - subtotal)} more for
                      FREE shipping!
                    </p>
                  )}

                  {/* Grand Total */}
                  <div className="pt-3 border-t-2 border-[var(--border-color)] flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-[var(--foreground)]">
                        Total Amount
                      </span>
                      <p className="text-[10px] text-[var(--foreground-muted)]">
                        VAT & Taxes included
                      </p>
                    </div>
                    <span className="text-xl font-black text-primary">
                      {formatPrice(grandTotal)}
                    </span>
                  </div>

                  {pointsEarned > 0 && (
                    <p className="text-[10px] text-[var(--foreground-muted)]">
                      You will earn{" "}
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {pointsEarned} points
                      </span>{" "}
                      when this order is delivered.
                    </p>
                  )}
                </div>

                {/* ── Place Order Action Button ── */}
                <div className="space-y-3 pt-2">
                  <Button
                    type="button"
                    onPress={() => {
                      if (isSuspended) {
                        setShowSuspendedAlert(true);
                        return;
                      }
                      handlePlaceOrder();
                    }}
                    isDisabled={isSuspended ? false : !isCheckoutReady}
                    className={`w-full h-12 rounded-xl text-white font-extrabold text-sm shadow-md transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                      isSuspended
                        ? "bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/25"
                        : "bg-primary hover:bg-primary-hover shadow-primary/25"
                    }`}
                  >
                    {isSuspended ? (
                      <span className="flex items-center gap-2">
                        <Ban className="w-4 h-4" />
                        Account Suspended (Cannot Place Order)
                      </span>
                    ) : isPlacingOrder ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Placing Your Order...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Place Order (${grandTotal.toFixed(2)})
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>

                  {!isShippingValid && (
                    <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Please fill in all shipping address fields.
                    </p>
                  )}

                  {selectedPaymentMethod !== "cod" && !isWalletVerified && (
                    <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      Verify your mobile wallet before placing order.
                    </p>
                  )}
                </div>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-[var(--border-color)] space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-[var(--foreground-muted)]">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>256-Bit SSL Encrypted Checkout</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[var(--foreground-muted)]">
                    <Truck className="w-4 h-4 text-primary shrink-0" />
                    <span>Fast Express Delivery & Tracking</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-[var(--foreground-secondary)] dark:text-[var(--foreground-secondary)]">
                    <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                    <span>100% Genuine Products Guarantee</span>
                  </div>
                </div>
              </Card.Content>
            </Card>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          DEMO MOBILE WALLET PAYMENT GATEWAY (PHONE + TRXID)
      ════════════════════════════════════════════════════════ */}
      {/* Demo wallet gateway: runs the phone + TrxID check, then shows the receipt. */}
      {isPaymentModalOpen && (
        <WalletPaymentModal
          gatewayName={currentPaymentOption.name}
          headerGradient={currentPaymentOption.gatewayHeaderBg}
          brandButtonClass={currentPaymentOption.brandButtonClass}
          brandBarClass={currentPaymentOption.brandBarClass}
          icon={currentPaymentOption.icon}
          siteName={settings.siteName || "Sparq"}
          amountLabel={formatPrice(grandTotal)}
          phone={walletPhone}
          transactionId={walletTransactionId}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={handleWalletPaymentSuccess}
        />
      )}
    </div>
    </>
  );
}
