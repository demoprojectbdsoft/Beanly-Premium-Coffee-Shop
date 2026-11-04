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
  /** Rider-only details, written from the rider's own profile page. */
  vehicleType?: string | null;
  vehicleNumber?: string | null;
  licenseNumber?: string | null;
  /** Riders go offline to stop receiving new delivery requests. */
  availability?: "online" | "offline" | null;
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
  images?: string[]; // up to 5 review photos
  date: string;
}

/**
 * Review payload type — mirrors the server-side ProductReview model.
 * Fields: productId, userId, rating (1-5), comment, images.
 * `createdAt` / `updatedAt` are added by MongoDB timestamps.
 */
export interface Review {
  productId: string;
  userId: string;
  rating: number; // 1 to 5
  comment: string;
  images?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  _id?: string;
  ownerId?: string;
  /**
   * The shop that sells this, when it is a seller's stock. Only the public
   * catalogue reads fill it — a row without the join simply shows no seller —
   * and an empty slug means the shop has no storefront link yet.
   */
  seller?: { id: string; name: string; slug: string };
  title: string;
  slug: string;
  categories: string[]; // e.g. ["Accessories", "Gift Sets"]
  // Populated references (present on product detail page)
  categoryId?: { name: string; slug: string; _id?: string; id?: string };
  subCategoryIds?: { name: string; slug: string; _id?: string; id?: string }[];
  price: number;
  originalPrice?: number;
  investPrice?: number;       // admin-only: purchase/cost price
  discountPercentage?: number; // e.g. 80 for -80%
  profitMargin?: number;      // computed: (price - investPrice) / price * 100
  unitProfit?: number;        // computed: price - investPrice
  totalProfit?: number;       // computed: (price - investPrice) * sellCount
  isOfferExpired?: boolean;   // true when offerEndDate has passed
  image: string;
  additionalImages?: string[];
  inStock: boolean;
  /** null means the product is not stock-tracked. */
  stockQuantity?: number | null;
  sellCount?: number;
  rating?: number;
  reviewCount?: number;
  badges?: string[];
  sku?: string;
  description?: string;
  specifications?: Record<string, string>;
  isFeatured?: boolean;
  warrantyPeriodMonths?: number;
  warrantyType?: "manufacturer-warranty" | "seller-warranty" | "extended-warranty" | "other" | "none";
  warrantyTerms?: string;
  offerEndDate?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// ─── Brand Marquee ───────────────────────────────────────────────────────────
// One logo in the scrolling band on the homepage. `logo` is an image URL, and
// when it is empty the `name` is written as plain text instead.
export interface SiteBrandLogo {
  name: string;
  logo: string;
  href?: string;
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

// ─── Site Settings (CMS / Branding) ──────────────────────────────────────────
export interface SiteColorPalette {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  backgroundDark: string;
  surface: string;
  surfaceDark: string;
  topBarFrom: string;
  topBarVia: string;
  topBarTo: string;
}

export interface SiteLogoSet {
  light: string;
  dark: string;
}

export interface SiteTopBarItem {
  label: string;
  href: string;
}

export interface SiteSocialLink {
  platform: string;
  url: string;
}

export interface SiteShippingConfig {
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
  standardDeliveryFee: number;
  expressDeliveryFee: number;
  estimatedDeliveryDays: string;
}

export interface SiteTypographyConfig {
  primaryFont: string;
  headingFont: string;
  baseFontSize?: string;
}

/**
 * Editable copy for the public /about page. Every field is optional because
 * settings saved before this group existed simply do not have it.
 */
export interface SiteAboutConfig {
  headline?: string;
  intro?: string;
  headquartersNote?: string;
  openingHoursNote?: string;
  ctaTitle?: string;
  ctaDescription?: string;
}

export interface SiteSettingsData {
  _id?: string;
  siteName: string;
  siteTagline: string;
  storeType: string;
  supportEmail: string;
  contactEmail?: string;
  supportPhone: string;
  openingHours?: string;
  address: string;
  /** Copy shown on the About page. */
  about?: SiteAboutConfig;
  metaTitle: string;
  metaDescription: string;
  topBarText: string;
  topBarEnabled: boolean;
  topBarItems: SiteTopBarItem[];
  /**
   * Which panel the single phone hamburger opens: a drawer from the left edge,
   * a drawer from the right edge, or the full-screen panel from the middle.
   */
  mobileMenuPlacement?: "left" | "right" | "middle";
  logoType: "both" | "img" | "text";
  navbarLogo: SiteLogoSet;
  footerLogo: SiteLogoSet;
  faviconUrl: string;
  colorPalette: SiteColorPalette;
  typography: SiteTypographyConfig;
  shipping: SiteShippingConfig;
  socialLinks: SiteSocialLink[];
  /** Logos that scroll across the homepage. Empty hides the whole band. */
  brandLogos?: SiteBrandLogo[];
  currency: string;
  timezone: string;
  maintenanceMode: boolean;
  shopBrowseMode?: "pagination" | "scroll";
  footerCopyright: string;
}

// ─── Page Specific Types (Re-exports) ─────────────────────────────────────────
export * from "./home";
export * from "./promo";
export * from "./promotion";
export * from "./coupon";
export * from "./activity";
export * from "./adminDashboard";
export * from "./customerDashboard";
export * from "./storeLocator";
export * from "./shop";
export * from "./cart";
export * from "./checkout";
export * from "./warranty";
export * from "./delivery";