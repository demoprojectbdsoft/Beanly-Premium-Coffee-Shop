"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
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

export default function Navbar() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLeftDrawerOpen, setIsLeftDrawerOpen] = useState(false);
  const [isRightDrawerOpen, setIsRightDrawerOpen] = useState(false);

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

  const closeAllMenus = () => {
    setMobileOpen(false);
    setIsLeftDrawerOpen(false);
    setIsRightDrawerOpen(false);
  };

  const handleOpenLeftDrawer = () => {
    setMobileOpen(false);
    setIsRightDrawerOpen(false);
    setIsLeftDrawerOpen(true);
  };

  const handleToggleHamburger = () => {
    setIsLeftDrawerOpen(false);
    setIsRightDrawerOpen(false);
    setMobileOpen((prev) => !prev);
  };

  const handleOpenRightDrawer = () => {
    setMobileOpen(false);
    setIsLeftDrawerOpen(false);
    setIsRightDrawerOpen(true);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/shop?search=${encodeURIComponent(searchQuery.trim())}`;
      closeAllMenus();
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white dark:bg-gray-950 shadow-xs transition-colors duration-200">
        {/* ── Top Navbar Row ── */}
        <div className="w-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
          <div className="w-full px-3 sm:px-4 md:px-14 py-3 flex items-center justify-between gap-2 sm:gap-4 md:gap-8">

            {/* Logo */}
            <SparqLogo size="md" />

            {/* Search Bar */}
            <div className="relative flex flex-1 items-center max-w-3xl min-w-0 mx-1 sm:mx-2">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-1 items-center border-2 border-primary rounded-full overflow-hidden bg-white dark:bg-gray-900 shadow-sm"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full px-3 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 bg-transparent focus:outline-none min-w-0"
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
            <div className="hidden md:flex items-center gap-4 text-gray-700 dark:text-gray-200 shrink-0">
              <Link
                href="/compare"
                aria-label="Compare Products"
                className="flex items-center text-gray-700 dark:text-gray-200 hover:text-primary transition-colors"
              >
                <ArrowLeftRight className="w-5 h-5 stroke-[1.8]" />
              </Link>
              <WishlistButton />
              <CartButton showTotal={true} />
              <div className="h-5 w-px bg-gray-200 dark:bg-gray-800" />
              <UserAccountMenu />
            </div>

            {/* Responsive Navigation Controls: Left Arrow + Hamburger + Right Arrow */}
            <div className="flex md:hidden items-center gap-1 shrink-0">
              {/* Left Arrow (HeroUI Left Drawer) */}
              <button
                type="button"
                aria-label="Open left drawer"
                onClick={handleOpenLeftDrawer}
                className={`p-1.5 sm:p-2 rounded-lg border text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer ${
                  isLeftDrawerOpen
                    ? "bg-primary text-white border-primary"
                    : "border-gray-200 dark:border-gray-800 hover:border-primary bg-gray-50/50 dark:bg-gray-900/50"
                }`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Hamburger Button (Toggles Sliding Expand Mobile Menu) */}
              <button
                type="button"
                aria-label="Toggle mobile menu"
                aria-expanded={mobileOpen}
                onClick={handleToggleHamburger}
                className={`p-1.5 sm:p-2 rounded-lg border text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer ${
                  mobileOpen
                    ? "bg-primary text-white border-primary dark:bg-primary dark:text-white"
                    : "border-gray-200 dark:border-gray-800 hover:border-primary bg-gray-50/50 dark:bg-gray-900/50"
                }`}
              >
                {mobileOpen ? (
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>

              {/* Right Arrow (HeroUI Right Drawer) */}
              <button
                type="button"
                aria-label="Open right drawer"
                onClick={handleOpenRightDrawer}
                className={`p-1.5 sm:p-2 rounded-lg border text-gray-700 dark:text-gray-200 hover:text-primary dark:hover:text-primary transition-colors cursor-pointer ${
                  isRightDrawerOpen
                    ? "bg-primary text-white border-primary"
                    : "border-gray-200 dark:border-gray-800 hover:border-primary bg-gray-50/50 dark:bg-gray-900/50"
                }`}
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

          </div>
        </div>

        {/* ── Desktop Bottom Navbar (Page Links & Promo banner) ── */}
        <BottomNavbar />

        {/* ── Expanding Mobile Menu Overlay (From Hamburger) ── */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              onClick={closeAllMenus}
            />
            {/* Full-screen panel sliding in from top */}
            <div className="absolute inset-0 bg-white dark:bg-gray-950 shadow-2xl animate-in slide-in-from-top-2 duration-200 flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 shrink-0">
                <div onClick={closeAllMenus}>
                  <SparqLogo size="sm" />
                </div>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={closeAllMenus}
                  className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Scrollable Content */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <MobileMenuContent
                  categories={categories}
                  subCategories={subCategories}
                  onClose={closeAllMenus}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── HeroUI Left Drawer (from Left Arrow) ── */}
        <Drawer
          isOpen={isLeftDrawerOpen}
          onOpenChange={(open) => {
            if (!open) setIsLeftDrawerOpen(false);
          }}
        >
          <DrawerBackdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-start transition-opacity duration-200">
            <DrawerContent
              placement="left"
              className="mr-auto h-full w-full max-w-[320px] sm:max-w-[360px] bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 shadow-2xl border-r border-gray-200 dark:border-gray-800 flex flex-col"
            >
              <DrawerDialog className="flex flex-col h-full outline-none">
                <DrawerHeader className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 shrink-0">
                  <div onClick={closeAllMenus}>
                    <SparqLogo size="sm" />
                  </div>
                  <DrawerCloseTrigger className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </DrawerCloseTrigger>
                </DrawerHeader>

                <DrawerBody className="flex-1 overflow-hidden p-0 flex flex-col min-h-0">
                  <MobileMenuContent
                    categories={categories}
                    subCategories={subCategories}
                    onClose={closeAllMenus}
                  />
                </DrawerBody>
              </DrawerDialog>
            </DrawerContent>
          </DrawerBackdrop>
        </Drawer>

        {/* ── HeroUI Right Drawer (from Right Arrow) ── */}
        <Drawer
          isOpen={isRightDrawerOpen}
          onOpenChange={(open) => {
            if (!open) setIsRightDrawerOpen(false);
          }}
        >
          <DrawerBackdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end transition-opacity duration-200">
            <DrawerContent
              placement="right"
              className="ml-auto h-full w-full max-w-[320px] sm:max-w-[360px] bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-100 shadow-2xl border-l border-gray-200 dark:border-gray-800 flex flex-col"
            >
              <DrawerDialog className="flex flex-col h-full outline-none">
                <DrawerHeader className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/50 shrink-0">
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wide">
                    Menu & Categories
                  </span>
                  <DrawerCloseTrigger className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/60 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </DrawerCloseTrigger>
                </DrawerHeader>

                <DrawerBody className="flex-1 overflow-hidden p-0 flex flex-col min-h-0">
                  <MobileMenuContent
                    categories={categories}
                    subCategories={subCategories}
                    onClose={closeAllMenus}
                  />
                </DrawerBody>
              </DrawerDialog>
            </DrawerContent>
          </DrawerBackdrop>
        </Drawer>
      </header>

      {/* ── Fixed Bottom Row on Small Devices (Home, Shop, About, Services, Contact with hover tooltips) ── */}
      <MobileBottomNav />

      {/* ── Floating Speed-Dial Button on Small Devices (Compare, Wishlist, Cart with live badges) ── */}
      <MobileFloatingActions />
    </>
  );
}