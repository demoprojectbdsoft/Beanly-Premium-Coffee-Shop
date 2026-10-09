"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Info,
  X,
  Clock,
  ExternalLink,
  Ban,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import { getCartByUserId } from "@/lib/api/cart";
import { createOrder } from "@/lib/action/orders";
import {
  CheckoutClientProps,
  CartData,
  CartItem,
  PaymentMethod,
  ShippingAddress,
} from "@/types";

// ── Shipping Cost Configuration ─────────────────────────────────────────────
const STANDARD_SHIPPING_COST = 15.0;
const FREE_SHIPPING_THRESHOLD = 50.0;

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
    icon: <Coins className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
  },
  {
    id: "bkash",
    name: "bKash Direct",
    subtitle: "Instant payment via bKash mobile wallet OTP",
    tag: "Fast & Popular",
    accentColor: "text-pink-600 dark:text-pink-400",
    bgActive: "bg-pink-50/70 dark:bg-pink-950/30",
    borderActive: "border-pink-500 dark:border-pink-500 ring-1 ring-pink-500/30",
    gatewayColor: "pink",
    gatewayHeaderBg: "from-[#D81B60] via-[#E2136E] to-[#C2185B]",
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
    icon: <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
  },
];

export default function CheckoutClient({
  initialCart,
  user: initialUser,
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

  // ── Shipping Form State ────────────────────────────────────────────────────
  const [shippingForm, setShippingForm] = useState<ShippingAddress>({
    fullName: user?.name || "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
  });

  // ── Payment Selection State ────────────────────────────────────────────────
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cod");

  // ── Wallet Verification State (React useState ONLY - session only) ─────────
  const [walletPhone, setWalletPhone] = useState<string>("");
  const [demoOtp, setDemoOtp] = useState<string | null>(null);
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [isOtpVerified, setIsOtpVerified] = useState<boolean>(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(60);

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

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpModalOpen && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpModalOpen, resendTimer]);

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

  const shippingCost =
    subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
      ? 0.0
      : STANDARD_SHIPPING_COST;
  const grandTotal = subtotal + shippingCost;
  const isCartEmpty = items.length === 0;

  // Validation: Shipping form must have all required fields
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
  // If COD: ready if shipping is valid
  // If Wallet: must have verified transactionId
  const isPaymentValid = useMemo(() => {
    if (selectedPaymentMethod === "cod") return true;
    return Boolean(transactionId && isOtpVerified);
  }, [selectedPaymentMethod, transactionId, isOtpVerified]);

  const isCheckoutReady =
    !isCartEmpty && isShippingValid && isPaymentValid && !isPlacingOrder;

  const currentPaymentOption =
    PAYMENT_OPTIONS.find((opt) => opt.id === selectedPaymentMethod) ||
    PAYMENT_OPTIONS[0];

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Reset wallet verification state when user switches payment method
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    if (method !== selectedPaymentMethod) {
      setSelectedPaymentMethod(method);
      // Reset wallet state when switching methods to prevent cross-wallet state leaks
      setWalletPhone("");
      setDemoOtp(null);
      setEnteredOtp("");
      setIsOtpSent(false);
      setIsOtpVerified(false);
      setTransactionId(null);
      setIsOtpModalOpen(false);
    }
  };

  const handleShippingChange = (
    field: keyof ShippingAddress,
    value: string
  ) => {
    setShippingForm((prev) => ({ ...prev, [field]: value }));
  };

  // 1. Send OTP (Demo) -> Triggers Modal
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }

    const cleanPhone = walletPhone.trim();
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error("Please enter a valid mobile number (min 10 digits)");
      return;
    }

    setIsSendingOtp(true);
    console.log("POST /api/payments/demo/send-otp payload:", {
      phone: cleanPhone,
      paymentMethod: selectedPaymentMethod,
    });

    try {
      // Simulate API call to POST /api/payments/demo/send-otp
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Generated 6-digit demo OTP for seamless interactive testing
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresInMinutes = 5;

      console.log("POST /api/payments/demo/send-otp response:", {
        otp: generatedOtp,
        expiresInMinutes,
      });

      setDemoOtp(generatedOtp);
      setIsOtpSent(true);
      setEnteredOtp("");
      setIsOtpVerified(false);
      setTransactionId(null);
      setResendTimer(60);
      setIsOtpModalOpen(true);

      toast.info(
        `Demo OTP sent to ${cleanPhone}: ${generatedOtp}`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to send OTP. Please retry.";
      toast.error(msg);
      console.error("Error in handleSendOtp:", err);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // 2. Verify OTP (Demo) inside Modal
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }

    const cleanOtp = enteredOtp.trim();
    if (!cleanOtp || cleanOtp.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP code");
      return;
    }

    setIsVerifyingOtp(true);
    console.log("POST /api/payments/demo/verify-otp payload:", {
      phone: walletPhone.trim(),
      otp: cleanOtp,
    });

    try {
      // Simulate API call to POST /api/payments/demo/verify-otp
      await new Promise((resolve) => setTimeout(resolve, 750));

      if (cleanOtp !== demoOtp && cleanOtp !== "123456") {
        throw new Error("Invalid OTP code. Please enter the demo code shown above.");
      }

      const generatedTrxId = `TRX-${selectedPaymentMethod.toUpperCase()}-${Date.now().toString().slice(-8)}`;
      console.log("POST /api/payments/demo/verify-otp response:", {
        transactionId: generatedTrxId,
      });

      setTransactionId(generatedTrxId);
      setIsOtpVerified(true);
      setIsOtpModalOpen(false);

      toast.success(
        `Payment verified successfully! Ref: ${generatedTrxId}`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Verification failed. Please retry.";
      toast.error(msg);
      console.error("Error in handleVerifyOtp:", err);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // 3. Reset/Retry Wallet Verification
  const handleResetWalletVerification = () => {
    setEnteredOtp("");
    setDemoOtp(null);
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setTransactionId(null);
    setIsOtpModalOpen(false);
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

    if (selectedPaymentMethod !== "cod" && (!transactionId || !isOtpVerified)) {
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
      ...(selectedPaymentMethod !== "cod" && transactionId
        ? { transactionId }
        : {}),
    };

    try {
      const response = await createOrder(orderData);

      // The backend returns { success, data: <order document>, message }
      const createdOrder = response?.data as { _id: string } | undefined;
      if (!createdOrder?._id) {
        throw new Error("Order created but no ID returned from server.");
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
    "border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl";
  const labelClass = "text-xs font-semibold text-slate-700 dark:text-slate-300";
  const fieldClass = "flex flex-col gap-1.5";
  const sectionHeadingClass =
    "text-base font-bold text-slate-900 dark:text-white flex items-center gap-2";

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
        <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Link
            href="/"
            className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link
            href="/cart"
            className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
          >
            Shopping Cart
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-900 dark:text-white">
            Checkout
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Secure{" "}
              <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Checkout
              </span>
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Review your delivery details and choose your preferred payment option.
            </p>
          </div>

          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 bg-sky-50 dark:bg-sky-950/40 px-3.5 py-2 rounded-xl border border-sky-100 dark:border-sky-900/60 transition-colors"
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
            <div className="w-16 h-16 rounded-full bg-sky-50 dark:bg-slate-800 text-sky-600 dark:text-sky-400 flex items-center justify-center mx-auto shadow-inner">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white">
                Your Shopping Cart is Empty
              </h2>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                You haven&apos;t added any items to your cart yet. Explore our wide
                range of premium electronics to continue checkout.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-sky-500/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
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
            {/* ── 1. Shipping Address Section ── */}
            <Card className={cardClass}>
              <Card.Content className="p-5 sm:p-6 md:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className={sectionHeadingClass}>
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span>1. Shipping & Delivery Address</span>
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Required fields marked <span className="text-rose-500">*</span>
                  </span>
                </div>

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
                      <UserIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      <Building className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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
                      <Hash className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </Card.Content>
            </Card>

            {/* ── 2. Payment Method Section ── */}
            <Card className={cardClass}>
              <Card.Content className="p-5 sm:p-6 md:p-7 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h2 className={sectionHeadingClass}>
                    <div className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span>2. Payment Method</span>
                  </h2>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Select one option
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
                            : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center shadow-2xs shrink-0">
                              {opt.icon}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">
                                {opt.name}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                {opt.subtitle}
                              </p>
                            </div>
                          </div>

                          {/* Custom Radio Pill */}
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "border-sky-500 bg-sky-500 text-white"
                                : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>

                        {opt.tag && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                              {opt.tag}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Conditional Payment Info & OTP Trigger Block ── */}
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
                        No advance payment or OTP verification required. You can pay
                        with cash directly to our delivery courier once you inspect your package.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Mobile Wallet Entry Block */
                  <div className="p-4 sm:p-5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-sky-500" />
                        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          {selectedPaymentMethod.toUpperCase()} Direct Verification
                        </h3>
                      </div>
                      {isOtpVerified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Payment Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/60">
                          <AlertCircle className="w-3 h-3" />
                          OTP Verification Required
                        </span>
                      )}
                    </div>

                    {/* Phone Number Input & Modal Trigger */}
                    <div className="space-y-2">
                      <label className={labelClass}>
                        {selectedPaymentMethod.toUpperCase()} Account Mobile Number
                      </label>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="tel"
                            placeholder="01XXXXXXXXX"
                            value={walletPhone}
                            onChange={(e) => setWalletPhone(e.target.value)}
                            disabled={isOtpVerified || isSendingOtp}
                            className="w-full"
                          />
                          <Smartphone className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {!isOtpVerified ? (
                          <Button
                            type="button"
                            onPress={() => handleSendOtp()}
                            isDisabled={
                              isSendingOtp ||
                              !walletPhone ||
                              walletPhone.trim().length < 10
                            }
                            className="h-10 px-5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-colors shrink-0 disabled:opacity-50"
                          >
                            {isSendingOtp ? (
                              <span className="flex items-center gap-1.5">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Sending OTP...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" />
                                Send OTP & Verify
                              </span>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onPress={handleResetWalletVerification}
                            className="h-10 px-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors shrink-0"
                          >
                            Change Number
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Verified State Banner */}
                    {isOtpVerified && transactionId && (
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
                              Ref Trx ID: {transactionId}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleResetWalletVerification}
                          className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 underline cursor-pointer"
                        >
                          Re-verify
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>

          {/* ════════════════════════════════════════════════════════
              RIGHT COLUMN (Order Summary Sidebar - Sticky)
          ════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-24">
            <Card className={cardClass}>
              <Card.Content className="p-5 sm:p-6 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-sky-500" />
                    Order Summary
                  </h3>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300">
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
                        <div className="relative w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/80 dark:border-slate-700">
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
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {productTitle}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Qty: {item.quantity} × ${productPrice.toFixed(2)}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            ${lineTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Price Breakdown */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      ${subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span>Standard Shipping</span>
                      <span className="text-[10px] text-slate-400">
                        (3-5 business days)
                      </span>
                    </div>
                    <span>
                      {shippingCost === 0 ? (
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          FREE
                        </span>
                      ) : (
                        `$${shippingCost.toFixed(2)}`
                      )}
                    </span>
                  </div>

                  {shippingCost > 0 && (
                    <p className="text-[10px] text-sky-600 dark:text-sky-400">
                      Add ${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)} more for
                      FREE shipping!
                    </p>
                  )}

                  {/* Grand Total */}
                  <div className="pt-3 border-t-2 border-slate-200 dark:border-slate-700 flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                        Total Amount
                      </span>
                      <p className="text-[10px] text-slate-400">
                        VAT & Taxes included
                      </p>
                    </div>
                    <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                      ${grandTotal.toFixed(2)}
                    </span>
                  </div>
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
                        : "bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:via-blue-700 hover:to-indigo-700 shadow-sky-500/25"
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

                  {isShippingValid &&
                    selectedPaymentMethod !== "cod" &&
                    !isOtpVerified && (
                      <p className="text-[11px] text-center text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        Verify your mobile wallet before placing order.
                      </p>
                    )}
                </div>

                {/* Trust Badges */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>256-Bit SSL Encrypted Checkout</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                    <Truck className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>Fast Express Delivery & Tracking</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
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
          REALISTIC PAYMENT GATEWAY OTP VERIFICATION MODAL
      ════════════════════════════════════════════════════════ */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 animate-in fade-in duration-150">
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Gateway Brand Header - Compact */}
            <div
              className={`px-4 py-3 bg-gradient-to-r ${currentPaymentOption.gatewayHeaderBg} text-white flex items-center justify-between relative overflow-hidden`}
            >
              <div className="flex items-center gap-2.5 relative z-10">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center border border-white/30 text-white shadow-xs">
                  {currentPaymentOption.icon}
                </div>
                <div>
                  <h3 className="text-xs font-black tracking-wide uppercase leading-tight">
                    {currentPaymentOption.name} Gateway
                  </h3>
                  <p className="text-[10px] text-white/80 font-medium">
                    Electro E-Commerce
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOtpModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer relative z-10"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Gateway Body - Compact */}
            <div className="p-4 space-y-3">
              {/* Compact Merchant & Phone Summary */}
              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block leading-none">Amount</span>
                  <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
                <div className="text-right font-mono text-[11px] text-slate-600 dark:text-slate-300">
                  <span className="text-[10px] text-slate-400 block font-sans leading-none">Mobile No</span>
                  <span className="font-bold">+880 {walletPhone}</span>
                </div>
              </div>

              {/* Demo Mode Compact Alert with 1-click Auto-fill */}
              {demoOtp && (
                <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold block leading-tight">
                        Demo OTP
                      </span>
                      <span className="font-mono font-bold text-xs text-amber-950 dark:text-amber-100">
                        {demoOtp}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEnteredOtp(demoOtp)}
                    className="text-[10px] font-bold text-amber-800 dark:text-amber-200 hover:text-amber-950 dark:hover:text-white bg-amber-200/60 dark:bg-amber-900/60 px-2 py-1 rounded-md border border-amber-300 dark:border-amber-700 cursor-pointer transition-colors"
                  >
                    Auto Fill
                  </button>
                </div>
              )}

              {/* 6-Digit OTP Input Form */}
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <div className="space-y-1 text-center">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Enter 6-Digit Verification Code
                  </label>
                  <Input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="• • • • • •"
                    value={enteredOtp}
                    onChange={(e) =>
                      setEnteredOtp(
                        e.target.value.replace(/\D/g, "").slice(0, 6)
                      )
                    }
                    className="font-mono text-center text-base tracking-[0.35em] font-bold h-10"
                  />
                </div>

                {/* Resend OTP Timer */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-0.5">
                  <span>Didn&apos;t receive code?</span>
                  {resendTimer > 0 ? (
                    <span className="font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      00:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp()}
                      disabled={isSendingOtp}
                      className="font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Resend Code
                    </button>
                  )}
                </div>

                {/* Modal Actions */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    type="button"
                    onPress={() => setIsOtpModalOpen(false)}
                    className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    isDisabled={isVerifyingOtp || enteredOtp.trim().length !== 6}
                    className={`h-9 rounded-xl text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1 ${
                      selectedPaymentMethod === "bkash"
                        ? "bg-[#E2136E] hover:bg-[#C2185B]"
                        : selectedPaymentMethod === "nagad"
                        ? "bg-[#F7941D] hover:bg-[#EA580C]"
                        : "bg-[#8C3494] hover:bg-[#7B1FA2]"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isVerifyingOtp ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Verifying...
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Verify OTP
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>

            {/* Gateway Footer Security */}
            <div className="py-2 px-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200/60 dark:border-slate-800 text-center flex items-center justify-center gap-1.5 text-[9px] text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>256-Bit Encrypted Payment Gateway</span>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
