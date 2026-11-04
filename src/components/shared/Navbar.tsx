"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Menu,
  X,
  ArrowLeftRight,
} from "lucide-react";
import {
  Drawer,
  DrawerBackdrop,
  DrawerContent,
  DrawerDialog,
  DrawerHeader,
  DrawerBody,
  DrawerCloseTrigger,
} from "@heroui/react";
import { Category, SubCategory } from "@/types";
import { getCategories } from "@/lib/api/categories";
import { getSubCategories } from "@/lib/api/subCategories";
import BottomNavbar from "./BottomNavbar";
import SparqLogo from "./SparqLogo";
import MobileBottomNav from "./MobileBottomNav";
import MobileFloatingActions from "./MobileFloatingActions";
import MobileMenuContent from "./MobileMenuContent";
import CartButton from "./CartButton";
import WishlistButton from "./WishlistButton";
import UserAccountMenu from "./UserAccountMenu";
import { useCompare } from "@/lib/compare";
import { useSiteSettings } from "@/context/SiteSettingsContext";

export default function Navbar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  // One navigation control on a phone, and only one panel can be up at a time.
  // Which panel the hamburger opens — the left drawer, the right drawer or the
  // full-screen middle panel — is the store's Site Settings choice, so the
  // three arrows that used to sit side by side are gone: they were the same
  // menu wearing three doors, and the bar out of their way is worth more.
  const [menuOpen, setMenuOpen] = useState(false);
  const { count: compareCount } = useCompare();
  const { settings } = useSiteSettings();
  const menuPlacement = settings.mobileMenuPlacement || "middle";

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [catRes, subRes] = await Promise.allSettled([
          getCategories(),
          getSubCategories(),
        ]);

        if (!isMounted) return;

        let loadedCats: Category[] = [];
        let loadedSubs: SubCategory[] = [];

        if (catRes.status === "fulfilled") {
          const val = catRes.value;
          if (val?.success && Array.isArray(val.data)) {
            loadedCats = val.data;
          } else if (Array.isArray(val)) {
            loadedCats = val;
          }
        }

        if (subRes.status === "fulfilled") {
          const val = subRes.value;
          if (val?.success && Array.isArray(val.data)) {
            loadedSubs = val.data;
          } else if (Array.isArray(val)) {
            loadedSubs = val;
          }
        }

        setCategories(loadedCats.filter((c) => c.isActive !== false));
        setSubCategories(loadedSubs.filter((s) => s.isActive !== false));
      } catch (err) {
        console.error("Failed to load navbar categories:", err);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
      closeMenu();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-[var(--navbar-bg)] shadow-xs transition-colors duration-200 border-b border-[var(--border-color)]">
        {/* ── Top Navbar Row ── */}
        <div className="w-full bg-[var(--navbar-bg)] border-b border-[var(--border-color)]">
          <div className="w-full px-3 sm:px-4 md:px-14 py-3 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">

            {/* Logo */}
            <SparqLogo size="md" />

            {/* Search Bar */}
            <div className="relative flex flex-1 items-center max-w-3xl min-w-0 mx-1 sm:mx-2">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-1 items-center border-2 border-primary rounded-full overflow-hidden bg-[var(--surface-elevated)] shadow-sm"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm text-[var(--foreground)] placeholder-[var(--foreground-muted)] bg-transparent focus:outline-none min-w-0"
                />
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary-hover text-white px-3.5 sm:px-6 py-2 sm:py-2.5 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                  aria-label="Search"
                >
                  <Search className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white stroke-[2.5]" />
                </button>
              </form>
            </div>

            {/* Desktop Right Action Icons & User Menu */}
            <div className="hidden md:flex items-center gap-3 text-[var(--foreground)] shrink-0">
              <Link
                href="/compare"
                aria-label={`Compare Products${compareCount > 0 ? ` (${compareCount})` : ""}`}
                className="relative flex items-center text-[var(--foreground-muted)] hover:text-primary transition-colors p-2 rounded-full hover:bg-[var(--surface-alt)]"
              >
                <ArrowLeftRight className="w-5 h-5 stroke-[1.8]" />
                {compareCount > 0 && (
                  <span className="absolute top-0 right-0 bg-primary text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm border border-[var(--surface-elevated)]">
                    {compareCount}
                  </span>
                )}
              </Link>
              <WishlistButton />
              <CartButton showTotal={true} />
              <div className="h-5 w-px bg-[var(--border-color)]" />
              {/* Storefront variant: Profile / Dashboard / Orders / Settings
                  plus the dashboard switcher, because out here this dropdown is
                  the only way into a workspace. */}
              <UserAccountMenu variant="storefront" />
            </div>

            {/* One navigation control: the hamburger, opening whatever panel
                the store picked in Site Settings. */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
              <button
                type="button"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`p-1.5 sm:p-2 rounded-lg border text-[var(--foreground)] hover:text-primary transition-colors cursor-pointer ${
                  menuOpen
                    ? "bg-primary text-white border-primary"
                    : "border-[var(--border-color)] hover:border-primary bg-[var(--surface)]/50"
                }`}
              >
                {menuOpen ? (
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>

          </div>
        </div>

        {/* ── Desktop Bottom Navbar (Page Links & Promo banner) ── */}
        <BottomNavbar />

        {/* ── Middle: full-screen panel, slid down from the bar ── */}
        {menuOpen && menuPlacement === "middle" && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              onClick={closeMenu}
            />
            {/* Full-screen panel sliding in from top */}
            <div className="absolute inset-0 bg-[var(--navbar-bg)] shadow-2xl animate-in slide-in-from-top-2 duration-200 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--surface)] shrink-0">
                <div onClick={closeMenu}>
                  <SparqLogo size="sm" />
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={closeMenu}
                  className="p-2 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Scrollable Content */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <MobileMenuContent
                  categories={categories}
                  subCategories={subCategories}
                  onClose={closeMenu}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Side drawer: the same menu, arriving from the edge the store
            picked. One drawer for both edges, because the only thing that
            changes between them is which side it hangs on. ── */}
        {menuPlacement !== "middle" && (
          <Drawer
            isOpen={menuOpen}
            onOpenChange={(open) => {
              if (!open) setMenuOpen(false);
            }}
          >
            <DrawerBackdrop
              className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex transition-opacity duration-200 ${
                menuPlacement === "right" ? "justify-end" : "justify-start"
              }`}
            >
              <DrawerContent
                placement={menuPlacement}
                className={`h-full w-full max-w-[320px] sm:max-w-[360px] bg-[var(--navbar-bg)] text-[var(--foreground)] shadow-2xl border-[var(--border-color)] flex flex-col ${
                  menuPlacement === "right"
                    ? "ml-auto border-l"
                    : "mr-auto border-r"
                }`}
              >
                <DrawerDialog className="flex flex-col h-full outline-none">
                  <DrawerHeader className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] bg-[var(--surface)] shrink-0">
                    {menuPlacement === "right" ? (
                      <span className="text-sm font-bold text-[var(--foreground)] uppercase tracking-wide">
                        Menu &amp; Categories
                      </span>
                    ) : (
                      <div onClick={closeMenu}>
                        <SparqLogo size="sm" />
                      </div>
                    )}
                    <DrawerCloseTrigger className="p-2 rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-alt)] transition-colors cursor-pointer">
                      <X className="w-5 h-5" />
                    </DrawerCloseTrigger>
                  </DrawerHeader>

                  <DrawerBody className="flex-1 overflow-hidden p-0 flex flex-col min-h-0">
                    <MobileMenuContent
                      categories={categories}
                      subCategories={subCategories}
                      onClose={closeMenu}
                    />
                  </DrawerBody>
                </DrawerDialog>
              </DrawerContent>
            </DrawerBackdrop>
          </Drawer>
        )}
      </header>

      {/* ── Fixed Bottom Row on Small Devices (Home, Shop, About, Services, Contact with hover tooltips) ── */}
      <MobileBottomNav />

      {/* ── Floating Speed-Dial Button on Small Devices (Compare, Wishlist, Cart with live badges) ── */}
      <MobileFloatingActions />
    </>
  );
}