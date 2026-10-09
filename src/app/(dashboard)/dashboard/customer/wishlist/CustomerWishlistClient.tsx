"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Select,
  ListBox,
  AlertDialog,
} from "@heroui/react";
import {
  Heart,
  ShoppingCart,
  ShoppingBag,
  Trash2,
  Search,
  ArrowRight,
  Star,
  ArrowUpDown,
  Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import { authClient } from "@/lib/auth-client";
import SuspendedAccountModal from "@/components/shared/SuspendedAccountModal";
import { CustomerWishlistItem } from "@/types/customerDashboard";
import { removeFromWishlist } from "@/lib/action/wishlist";
import { addToCart, isCarted as checkIsCartedAction } from "@/lib/action/cart";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest Added" },
  { key: "price_asc", label: "Price: Low to High" },
  { key: "price_desc", label: "Price: High to Low" },
  { key: "rating_desc", label: "Highest Rated" },
];

function WishlistProductCard({
  item,
  onRemove,
}: {
  item: CustomerWishlistItem;
  onRemove: (item: CustomerWishlistItem) => void;
}) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const userRole = ((user as { role?: string })?.role || "").toLowerCase();

  const [isInCart, setIsInCart] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSuspendedAlert, setShowSuspendedAlert] = useState(false);

  const isSuspended = ((user as { status?: string })?.status || "").toLowerCase() === "suspended";

  useEffect(() => {
    if (!item.productId) return;
    const loadCart = () => {
      checkIsCartedAction(item.productId).then((res) => {
        setIsInCart(Boolean(res?.isInCart || res?.isCarted));
      });
    };
    loadCart();
    window.addEventListener("cart-updated", loadCart);
    return () => window.removeEventListener("cart-updated", loadCart);
  }, [item.productId]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.info("Please log in to add items to your cart");
      router.push("/auth/login");
      return;
    }
    if (isSuspended) {
      setShowSuspendedAlert(true);
      return;
    }
    if (userRole === "admin") {
      toast.warning("Admin cannot add products to cart!");
      return;
    }
    if (!item.inStock) {
      toast.error("Sorry, this item is out of stock!");
      return;
    }
    if (isInCart) {
      toast.info(`"${item.title}" is already in your cart!`);
      return;
    }

    setIsAdding(true);
    try {
      await addToCart(item.productId, 1);
      setIsInCart(true);
      toast.success(`"${item.title}" added to cart!`);
      window.dispatchEvent(new CustomEvent("cart-updated"));
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
    <SuspendedAccountModal
      isOpen={showSuspendedAlert}
      onOpenChange={setShowSuspendedAlert}
      message="Your account has been suspended. You are not allowed to add items to the cart. Please contact support for assistance."
    />

    <div className="group relative bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-3.5 sm:p-4 flex flex-col justify-between hover:border-sky-500/40 hover:shadow-lg transition-all">
      {/* Discount Badge */}
      {item.discountPercentage ? (
        <span className="absolute top-3 left-3 z-10 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-red-500 text-white shadow-xs">
          -{item.discountPercentage}%
        </span>
      ) : null}

      {/* Image */}
      <Link
        href={`/shop/${item.slug || item.productId}`}
        className="block relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 dark:bg-gray-950 mb-3"
      >
        <Image
          src={item.image || "/placeholder.png"}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 50vw, 25vw"
          className="object-contain p-2 group-hover:scale-105 transition-transform"
          unoptimized
        />
      </Link>

      {/* Details */}
      <div className="space-y-1 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span className="font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider truncate max-w-[120px]">
            {item.category}
          </span>
          <span>{item.addedAt}</span>
        </div>

        <Link
          href={`/shop/${item.slug || item.productId}`}
          className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white line-clamp-2 hover:text-sky-600 transition-colors"
        >
          {item.title}
        </Link>

        {/* Rating */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 pt-0.5">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>{item.rating > 0 ? item.rating.toFixed(1) : "—"}</span>
        </div>
      </div>

      {/* Price & Actions */}
      <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-gray-800">
        <div className="flex flex-col">
          {item.originalPrice && item.originalPrice > item.price ? (
            <>
              <span className="text-[10px] text-gray-400 line-through">
                ${item.originalPrice.toFixed(2)}
              </span>
              <span className="text-sm font-extrabold text-red-500">
                ${item.price.toFixed(2)}
              </span>
            </>
          ) : (
            <span className="text-sm font-extrabold text-gray-900 dark:text-white">
              ${item.price.toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onRemove(item)}
            title="Remove from wishlist"
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleAddToCart}
            disabled={!item.inStock || isAdding}
            title={isInCart ? "In cart" : "Add to cart"}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
              !item.inStock
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                : isInCart
                ? "bg-sky-500 text-white cursor-default"
                : "bg-slate-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-sky-500 hover:text-white cursor-pointer"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
    </>
  );
}

interface CustomerWishlistClientProps {
  initialItems?: CustomerWishlistItem[];
  categories?: { _id?: string; name: string }[];
}

export default function CustomerWishlistClient({
  initialItems = [],
  categories = [],
}: CustomerWishlistClientProps) {
  const [items, setItems] = useState<CustomerWishlistItem[]>(initialItems);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const handleRemove = async (item: CustomerWishlistItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id && i.productId !== item.productId));
    toast.info(`Removed "${item.title}" from wishlist.`);
    await removeFromWishlist(item.productId).catch(() => {});
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wishlist-updated"));
    }
  };

  const handleClearAll = async () => {
    const current = [...items];
    setItems([]);
    toast.info("Wishlist cleared.");
    for (const item of current) {
      await removeFromWishlist(item.productId).catch(() => {});
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("wishlist-updated"));
    }
  };

  // Filter & Sort
  const filteredItems = items
    .filter((item) => {
      const matchCat =
        category === "all" ||
        item.category.toLowerCase() === category.toLowerCase();
      const matchSearch =
        !search.trim() ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sort === "price_asc") return a.price - b.price;
      if (sort === "price_desc") return b.price - a.price;
      if (sort === "rating_desc") return b.rating - a.rating;
      return 0;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
            <Link href="/dashboard/customer" className="hover:text-sky-600">
              Customer Dashboard
            </Link>
            <span>/</span>
            <span className="text-sky-600 dark:text-sky-400">Wishlist</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            My Saved{" "}
            <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              Wishlist
            </span>
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {items.length} saved product{items.length !== 1 ? "s" : ""}
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold shadow-xs h-9"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>View Cart</span>
            </Link>

            <AlertDialog.Root>
              <AlertDialog.Trigger>
                <Button
                  variant="outline"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold h-9 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </Button>
              </AlertDialog.Trigger>
              <AlertDialog.Backdrop isDismissable className="bg-black/60">
                <AlertDialog.Container size="sm">
                  <AlertDialog.Dialog className="rounded-2xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 space-y-4 shadow-xl">
                    {({ close }) => (
                      <>
                        <div className="space-y-1">
                          <AlertDialog.Heading className="text-base font-bold text-gray-900 dark:text-white">
                            Clear Wishlist?
                          </AlertDialog.Heading>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Remove all saved items from your wishlist?
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <Button variant="outline" size="sm" onPress={close} className="text-xs">
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onPress={async () => {
                              await handleClearAll();
                              close();
                            }}
                            className="text-xs font-bold bg-rose-600 text-white"
                          >
                            Clear All
                          </Button>
                        </div>
                      </>
                    )}
                  </AlertDialog.Dialog>
                </AlertDialog.Container>
              </AlertDialog.Backdrop>
            </AlertDialog.Root>
          </div>
        )}
      </div>

      {/* Toolbar: Search, Real Category Select, Sort Select */}
      {items.length > 0 && (
        <Card className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 z-10" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search wishlist..."
                className="w-full pl-9 pr-3 h-10 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-xs"
              />
            </div>

            {/* Real Categories Select (HeroUI) */}
            <div>
              <Select
                selectedKey={category}
                onSelectionChange={(key) => setCategory(key ? String(key) : "all")}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                  <div className="flex items-center gap-2 truncate">
                    <Layers className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <Select.Value className="text-xs font-semibold truncate" />
                  </div>
                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                </Select.Trigger>
                <Select.Popover className="w-56 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                  <ListBox className="space-y-1 p-0">
                    <ListBox.Item
                      key="all"
                      id="all"
                      textValue="All Categories"
                      className="px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer flex items-center justify-between data-[selected=true]:bg-sky-500 data-[selected=true]:text-white font-semibold transition-colors"
                    >
                      All Categories
                    </ListBox.Item>
                    {categories.map((c) => (
                      <ListBox.Item
                        key={c.name}
                        id={c.name}
                        textValue={c.name}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer flex items-center justify-between data-[selected=true]:bg-sky-500 data-[selected=true]:text-white font-semibold transition-colors"
                      >
                        {c.name}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>

            {/* Sort Select (HeroUI) */}
            <div>
              <Select
                selectedKey={sort}
                onSelectionChange={(key) => setSort(key ? String(key) : "newest")}
              >
                <Select.Trigger className="h-10 w-full px-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                  <div className="flex items-center gap-2 truncate">
                    <ArrowUpDown className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                    <Select.Value className="text-xs font-semibold truncate" />
                  </div>
                  <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
                </Select.Trigger>
                <Select.Popover className="w-56 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                  <ListBox className="space-y-1 p-0">
                    {SORT_OPTIONS.map((opt) => (
                      <ListBox.Item
                        key={opt.key}
                        id={opt.key}
                        textValue={opt.label}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer flex items-center justify-between data-[selected=true]:bg-sky-500 data-[selected=true]:text-white font-semibold transition-colors"
                      >
                        {opt.label}
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </div>
          </div>
        </Card>
      )}

      {/* Grid */}
      {items.length === 0 ? (
        <Card className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center mx-auto">
            <Heart className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Your Wishlist is Empty
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Save your favorite electronics to find them quickly later.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-sm"
          >
            <span>Explore Products</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Card>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center space-y-2">
          <p className="text-sm font-bold text-gray-900 dark:text-white">
            No matching products
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            No products match your search or selected category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredItems.map((item) => (
            <WishlistProductCard
              key={item.id || item.productId}
              item={item}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
