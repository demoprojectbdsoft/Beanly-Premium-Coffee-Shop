import React from "react";
import { LucideIcon } from "lucide-react";

// ─── Layout & Common Global Types ─────────────────────────────────────────────
export interface LayoutProps {
  children: React.ReactNode;
}

// ─── Header & TopBar ──────────────────────────────────────────────────────────
export interface TopBarItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

// ─── Navbar & Search ──────────────────────────────────────────────────────────
export interface CategoryOption {
  label: string;
  value: string;
}

export interface HeaderActionItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badgeCount?: number;
  showPrice?: boolean;
}

// ─── Categories Mega Menu ─────────────────────────────────────────────────────
export interface CategoryMenuItem {
  id: string;
  name: string;
  href: string;
  isBold?: boolean;
  hasSubmenu?: boolean;
  SubMenuComponent?: React.ComponentType;
}

export interface CategorySubItem {
  name: string;
  href: string;
  isBold?: boolean;
}

export interface CategoryGroup {
  title: string;
  href?: string;
  items: CategorySubItem[];
}

export interface MegaMenuPromo {
  badge?: string;
  subtitle?: string;
  title?: string;
  titleClassName?: string;
  linkText?: string;
  linkHref?: string;
  customContent?: React.ReactNode;
}

export interface MegaMenuConfig {
  groups: CategoryGroup[];
  promo?: MegaMenuPromo;
  showBranding?: boolean;
  imageSrc?: string;
  imageAlt?: string;
}

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  image?: string | null;
  avatar?: string | null;
  role?: string | null;
  plan?: string | null;
  status?: string | null;
  member?: "silver" | "gold" | "platinum" | "diamond" | string | null;
  points?: number | null;
  phone?: string | null;
  bio?: string | null;
  department?: string | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
}

// ─── Products & Reviews ───────────────────────────────────────────────────────
export interface ProductBadge {
  text: string;
  type: "discount" | "new" | "hot" | "sale";
}

export interface ProductReview {
  id: string;
  userId?: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
  comment: string;
  date: string;
}

/**
 * Review payload type — mirrors the server-side ProductReview model.
 * Fields: productId, userId, rating (1-5), comment.
 * `createdAt` / `updatedAt` are added by MongoDB timestamps.
 */
export interface Review {
  productId: string;
  userId: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  ownerId?: string;
  title: string;
  slug: string;
  categories: string[]; // e.g. ["Accessories", "Headphone Cases"]
  // Populated references (present on product detail page)
  categoryId?: { name: string; slug: string };
  subCategoryIds?: { name: string; slug: string }[];
  price: number;
  originalPrice?: number;
  investPrice?: number;       // admin-only: purchase/cost price
  discountPercentage?: number; // e.g. 80 for -80%
  profitMargin?: number;      // computed: (price - investPrice) / price * 100
  isOfferExpired?: boolean;   // true when offerEndDate has passed
  image: string;
  additionalImages?: string[];
  inStock: boolean;
  stockQuantity?: number;
  sellCount?: number;
  rating?: number;
  reviewCount?: number;
  badges?: string[];
  sku?: string;
  description?: string;
  specifications?: Record<string, string>;
  isFeatured?: boolean;
  offerEndDate?: string | Date;
}

// ─── Brand ───────────────────────────────────────────────────────────────────
export interface Brand {
  id: string;
  name: string;
  renderLogo: () => React.ReactNode;
}

// ─── Categories & Subcategories ──────────────────────────────────────────────
export interface Category {
  _id?: string;
  id?: string;
  ownerId?: string;
  name: string;
  slug: string;
  image?: File | string;
  description?: string;
  isActive?: boolean;
}

export interface SubCategory {
  _id?: string;
  id?: string;
  ownerId?: string;
  categoryId: string; // selected from a dropdown of existing categories
  name: string;
  slug: string;
  image?: File | string;
  description?: string;
  isActive?: boolean;
}

// ─── Page Specific Types (Re-exports) ─────────────────────────────────────────
export * from "./home";
export * from "./adminDashboard";
export * from "./customerDashboard";
export * from "./storeLocator";
export * from "./shop";
export * from "./cart";
export * from "./checkout";