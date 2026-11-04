"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Card,
  Button,
  Input,
  TextArea,
  Switch,
  Select,
  ListBox,
} from "@heroui/react";
import {
  Globe,
  Palette,
  Type,
  ImageIcon,
  Truck,
  Phone,
  Shield,
  Sparkles,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Check,
  CheckCircle2,
  Eye,
  Settings,
  ChevronRight,
  Gem,
  Shirt,
  Utensils,
  Cake,
  Coffee,
  Cpu,
  Wand2,
  BookmarkCheck,
  Leaf,
  Bot,
  Zap,
  Sprout,
  AlertCircle,
  FileText,
  Menu,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  SiteSettingsData,
  SiteTopBarItem,
  SiteSocialLink,
  SiteColorPalette,
  SiteBrandLogo,
} from "@/types";
import { updateSiteSettings } from "@/lib/action/siteSettings";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { getCurrencySymbol } from "@/lib/currency";
import ImageUploader from "@/components/shared/ImageUploader";
import AppSelect from "@/components/shared/AppSelect";
import { BrandLogoMark } from "@/components/homepage/Brand";

// ── Phone Menu Placements ─────────────────────────────────────────────────────
// The small-screen navbar carries a single hamburger, and this is the one panel
// it opens. Same menu in all three, only the door differs - so the words below
// are what the owner reads while choosing, and the middle one is the default
// because that is the shape the bar had before it ever had a choice.
type MobileMenuPlacement = "left" | "right" | "middle";

const MOBILE_MENU_PLACEMENTS: {
  value: MobileMenuPlacement;
  label: string;
  note: string;
}[] = [
  {
    value: "left",
    label: "Left drawer",
    note: "The menu slides in from the left edge, like a classic side drawer.",
  },
  {
    value: "right",
    label: "Right drawer",
    note: "The menu slides in from the right edge, under the thumb of whoever holds the phone.",
  },
  {
    value: "middle",
    label: "Middle - full screen",
    note: "The menu unfolds from the bar and takes the whole screen.",
  },
];


// ── Tabs Navigation ───────────────────────────────────────────────────────────
const SETTING_TABS = [
  { id: "identity", label: "Identity & Meta", icon: Globe },
  { id: "fonts", label: "Typography & Fonts", icon: Type },
  { id: "colors", label: "Theme & Palettes", icon: Palette },
  { id: "shipping", label: "Shipping & Delivery", icon: Truck },
  { id: "topbar", label: "Top Bar & Layout", icon: Sparkles },
  { id: "branding", label: "Logos & Media", icon: ImageIcon },
  { id: "contact", label: "Contact & Socials", icon: Phone },
  { id: "system", label: "System & Security", icon: Shield },
];

// ── Google Font Curated Options ────────────────────────────────────────────────
const GOOGLE_FONTS = [
  { name: "Open Sans", category: "Humanist Sans", sample: "Balanced, neutral & easy to read." },
  { name: "Poppins", category: "Geometric Sans", sample: "Modern, tech-forward & friendly." },
  { name: "Josefin Sans", category: "Geometric Vintage", sample: "Elegant, Scandinavian vintage & sleek." },
  { name: "Inter", category: "Modern Neo-grotesque", sample: "Crisp, clean & highly readable." },
  { name: "Roboto", category: "Classic Sans", sample: "Google classic, versatile & solid." },
  { name: "Plus Jakarta Sans", category: "Contemporary Sans", sample: "Trendy, clean SaaS aesthetic." },
  { name: "Outfit", category: "Futuristic Sans", sample: "Premium, sleek & geometric." },
  { name: "Montserrat", category: "Punchy Sans", sample: "Bold, modern architectural style." },
  { name: "Playfair Display", category: "Elegant Serif", sample: "Luxury, fashion & jewelry vibe." },
  { name: "Cormorant Garamond", category: "High Luxury Serif", sample: "Royal, fine dining & jewelry." },
  { name: "Merriweather", category: "Warm Editorial", sample: "Cozy, bakery & coffee warmth." },
  { name: "Cinzel", category: "Roman Luxury", sample: "Prestige, watches & regal tone." },
  { name: "Space Grotesk", category: "Quirky Tech", sample: "Edgy, futuristic tech character." },
];

// ── Comprehensive Industry Color Palettes ──────────────────────────────────────
export interface ThemePreset {
  id: string;
  name: string;
  category: "green" | "tech" | "jewelry" | "fashion" | "restaurant" | "bakery" | "coffee" | "custom";
  categoryLabel: string;
  badgeIcon?: React.ElementType;
  description: string;
  palette: SiteColorPalette;
}

const DEFAULT_THEME_PRESETS: ThemePreset[] = [
  // ── 1. Jewelry & Luxury Goods
  {
    id: "royal-gold-onyx",
    name: "Royal Gold & Onyx",
    category: "jewelry",
    categoryLabel: "Jewelry & Luxury",
    badgeIcon: Gem,
    description: "Cartier & Rolex inspired: 24K gilded gold, velvet onyx & champagne.",
    palette: {
      primary: "#d4af37",
      primaryDark: "#b8860b",
      secondary: "#f3e5ab",
      accent: "#e5c158",
      background: "#ffffff",
      backgroundDark: "#0c0a09",
      surface: "#fafaf9",
      surfaceDark: "#1c1917",
      topBarFrom: "#1c1917",
      topBarVia: "#78350f",
      topBarTo: "#d4af37",
    },
  },
  {
    id: "rose-gold-diamond",
    name: "Rose Gold & Diamond",
    category: "jewelry",
    categoryLabel: "Jewelry & Luxury",
    badgeIcon: Gem,
    description: "Romantic luxury: shimmering rose gold, blush silk & diamond platinum.",
    palette: {
      primary: "#b76e79",
      primaryDark: "#944e59",
      secondary: "#e0a899",
      accent: "#f5d0c5",
      background: "#fffafb",
      backgroundDark: "#140c0f",
      surface: "#fdf2f4",
      surfaceDark: "#24141a",
      topBarFrom: "#4a1525",
      topBarVia: "#944e59",
      topBarTo: "#b76e79",
    },
  },
  {
    id: "tiffany-turquoise",
    name: "Tiffany Robin Egg Blue",
    category: "jewelry",
    categoryLabel: "Jewelry & Luxury",
    badgeIcon: Gem,
    description: "Iconic Fifth Avenue luxury: Tiffany turquoise with platinum white.",
    palette: {
      primary: "#0abab5",
      primaryDark: "#088f8a",
      secondary: "#81d8d0",
      accent: "#14b8a6",
      background: "#f0fdfa",
      backgroundDark: "#041b1a",
      surface: "#ccfbf1",
      surfaceDark: "#0b2e2c",
      topBarFrom: "#0f766e",
      topBarVia: "#0abab5",
      topBarTo: "#115e59",
    },
  },

  // ── 2. Clothes & Fashion Apparel
  {
    id: "haute-couture-noir",
    name: "Haute Couture Noir",
    category: "fashion",
    categoryLabel: "Fashion & Apparel",
    badgeIcon: Shirt,
    description: "Zara & SSENSE editorial: high-contrast obsidian black with alabaster.",
    palette: {
      primary: "#18181b",
      primaryDark: "#09090b",
      secondary: "#52525b",
      accent: "#d4d4d8",
      background: "#ffffff",
      backgroundDark: "#09090b",
      surface: "#f4f4f5",
      surfaceDark: "#18181b",
      topBarFrom: "#09090b",
      topBarVia: "#18181b",
      topBarTo: "#27272a",
    },
  },
  {
    id: "terracotta-linen",
    name: "Terracotta & Raw Linen",
    category: "fashion",
    categoryLabel: "Fashion & Apparel",
    badgeIcon: Shirt,
    description: "Mediterranean summer fashion: warm earthy terracotta, sand & ochre.",
    palette: {
      primary: "#c2410c",
      primaryDark: "#9a3412",
      secondary: "#ea580c",
      accent: "#fbbf24",
      background: "#fffbf5",
      backgroundDark: "#1a0f08",
      surface: "#ffedd5",
      surfaceDark: "#2d1a0e",
      topBarFrom: "#7c2d12",
      topBarVia: "#c2410c",
      topBarTo: "#ea580c",
    },
  },
  {
    id: "velvet-berry-chic",
    name: "Velvet Berry Chic",
    category: "fashion",
    categoryLabel: "Fashion & Apparel",
    badgeIcon: Shirt,
    description: "Luxury women's apparel: opulent mulberry wine, berry rose & cashmere.",
    palette: {
      primary: "#be185d",
      primaryDark: "#9d174d",
      secondary: "#db2777",
      accent: "#f472b6",
      background: "#fdf2f8",
      backgroundDark: "#1c0714",
      surface: "#fce7f3",
      surfaceDark: "#2d0b20",
      topBarFrom: "#831843",
      topBarVia: "#be185d",
      topBarTo: "#9d174d",
    },
  },

  // ── 3. Restaurant & Fine Dining
  {
    id: "bordeaux-wine-dining",
    name: "Bordeaux Wine & Truffle",
    category: "restaurant",
    categoryLabel: "Restaurant & Dining",
    badgeIcon: Utensils,
    description: "Michelin bistro: deep Cabernet burgundy, aged brass & warm parchment.",
    palette: {
      primary: "#881337",
      primaryDark: "#4c0519",
      secondary: "#9f1239",
      accent: "#eab308",
      background: "#fff1f2",
      backgroundDark: "#140408",
      surface: "#ffe4e6",
      surfaceDark: "#260810",
      topBarFrom: "#4c0519",
      topBarVia: "#881337",
      topBarTo: "#9f1239",
    },
  },
  {
    id: "tuscan-olive-bistro",
    name: "Tuscan Olive & Herb",
    category: "restaurant",
    categoryLabel: "Restaurant & Dining",
    badgeIcon: Utensils,
    description: "Italian trattoria: cold-pressed olive grove green, rosemary & roasted terracotta.",
    palette: {
      primary: "#3f6212",
      primaryDark: "#1a2e05",
      secondary: "#65a30d",
      accent: "#ea580c",
      background: "#f7fee7",
      backgroundDark: "#0b1404",
      surface: "#ecfccb",
      surfaceDark: "#172509",
      topBarFrom: "#1a2e05",
      topBarVia: "#3f6212",
      topBarTo: "#4d7c0f",
    },
  },
  {
    id: "spiced-paprika-grill",
    name: "Spiced Paprika & Charcoal",
    category: "restaurant",
    categoryLabel: "Restaurant & Dining",
    badgeIcon: Utensils,
    description: "Gourmet steakhouse: smoked paprika red, glowing amber coals & cast iron.",
    palette: {
      primary: "#dc2626",
      primaryDark: "#991b1b",
      secondary: "#ea580c",
      accent: "#facc15",
      background: "#fef2f2",
      backgroundDark: "#180606",
      surface: "#fee2e2",
      surfaceDark: "#2b0a0a",
      topBarFrom: "#7f1d1d",
      topBarVia: "#dc2626",
      topBarTo: "#ea580c",
    },
  },

  // ── 4. Bakery & Pastry Café
  {
    id: "golden-brioche-honey",
    name: "Golden Brioche & Honey",
    category: "bakery",
    categoryLabel: "Bakery & Patisserie",
    badgeIcon: Cake,
    description: "Artisan French boulangerie: oven-fresh golden brioche, wildflower honey & butter.",
    palette: {
      primary: "#d97706",
      primaryDark: "#b45309",
      secondary: "#f59e0b",
      accent: "#fde68a",
      background: "#fffdf5",
      backgroundDark: "#1a1205",
      surface: "#fef3c7",
      surfaceDark: "#291c08",
      topBarFrom: "#78350f",
      topBarVia: "#d97706",
      topBarTo: "#b45309",
    },
  },
  {
    id: "strawberry-macaron",
    name: "Strawberry Macaron Cream",
    category: "bakery",
    categoryLabel: "Bakery & Patisserie",
    badgeIcon: Cake,
    description: "Pastry café: sweet strawberry glaze, whipped vanilla cream & pastel sprinkles.",
    palette: {
      primary: "#f43f5e",
      primaryDark: "#be123c",
      secondary: "#fb7185",
      accent: "#fbcfe8",
      background: "#fff1f2",
      backgroundDark: "#1f060d",
      surface: "#ffe4e6",
      surfaceDark: "#330b17",
      topBarFrom: "#9f1239",
      topBarVia: "#f43f5e",
      topBarTo: "#fb7185",
    },
  },
  {
    id: "matcha-pistachio-tart",
    name: "Matcha & Pistachio Cream",
    category: "bakery",
    categoryLabel: "Bakery & Patisserie",
    badgeIcon: Cake,
    description: "Japanese confectionery: Ceremonial Uji matcha, pistachio cream & almond sponge.",
    palette: {
      primary: "#65a30d",
      primaryDark: "#365314",
      secondary: "#84cc16",
      accent: "#bef264",
      background: "#f7fee7",
      backgroundDark: "#0d1a04",
      surface: "#ecfccb",
      surfaceDark: "#193009",
      topBarFrom: "#365314",
      topBarVia: "#65a30d",
      topBarTo: "#4d7c0f",
    },
  },

  // ── 5. Coffee Shop & Roastery
  {
    id: "espresso-roastery-caramel",
    name: "Espresso & Roasted Caramel",
    category: "coffee",
    categoryLabel: "Coffee Roastery",
    badgeIcon: Coffee,
    description: "Specialty coffee roastery: dark roast espresso, crema froth & toasted hazelnut.",
    palette: {
      primary: "#78350f",
      primaryDark: "#451a03",
      secondary: "#92400e",
      accent: "#fbbf24",
      background: "#fffbeb",
      backgroundDark: "#170a03",
      surface: "#fef3c7",
      surfaceDark: "#261205",
      topBarFrom: "#451a03",
      topBarVia: "#78350f",
      topBarTo: "#92400e",
    },
  },

  // ── 6. Electronics & Tech
  {
    id: "sparq-tech-blue",
    name: "Sparq Tech Blue (Default)",
    category: "tech",
    categoryLabel: "Electronics & Tech",
    badgeIcon: Cpu,
    description: "High-tech futuristic: vibrant cyan-sky, neon indigo & energizing amber.",
    palette: {
      primary: "#0284c7",
      primaryDark: "#0369a1",
      secondary: "#6366f1",
      accent: "#f59e0b",
      background: "#ffffff",
      backgroundDark: "#0b0f19",
      surface: "#f8fafc",
      surfaceDark: "#131d2e",
      topBarFrom: "#1d4ed8",
      topBarVia: "#0284c7",
      topBarTo: "#4338ca",
    },
  },
  {
    id: "cyber-matrix-purple",
    name: "Cyber Violet & Aqua",
    category: "tech",
    categoryLabel: "Electronics & Tech",
    badgeIcon: Cpu,
    description: "Gaming & next-gen tech: neon ultraviolet with electric turquoise highlights.",
    palette: {
      primary: "#7c3aed",
      primaryDark: "#5b21b6",
      secondary: "#06b6d4",
      accent: "#f43f5e",
      background: "#faf5ff",
      backgroundDark: "#0d041a",
      surface: "#f3e8ff",
      surfaceDark: "#1a0933",
      topBarFrom: "#4c1d95",
      topBarVia: "#7c3aed",
      topBarTo: "#0891b2",
    },
  },

  // ── 7. Green, Plants & Eco Environment
  {
    id: "urban-jungle-plants",
    name: "Urban Jungle & Houseplants",
    category: "green",
    categoryLabel: "Plants & Nursery",
    badgeIcon: Sprout,
    description: "Botanical plant boutique: lush Monstera forest green, sage shoots & warm terracotta.",
    palette: {
      primary: "#15803d",
      primaryDark: "#14532d",
      secondary: "#22c55e",
      accent: "#d97706",
      background: "#f7fee7",
      backgroundDark: "#081406",
      surface: "#ecfccb",
      surfaceDark: "#12260d",
      topBarFrom: "#14532d",
      topBarVia: "#15803d",
      topBarTo: "#16a34a",
    },
  },
  {
    id: "rainforest-eco-sanctuary",
    name: "Rainforest Eco Sanctuary",
    category: "green",
    categoryLabel: "Eco & Environment",
    badgeIcon: Leaf,
    description: "Ecology & organic habitat: deep canopy emerald, living jade & solar warmth.",
    palette: {
      primary: "#047857",
      primaryDark: "#064e3b",
      secondary: "#10b981",
      accent: "#facc15",
      background: "#f0fdf4",
      backgroundDark: "#021a10",
      surface: "#dcfce7",
      surfaceDark: "#05311e",
      topBarFrom: "#064e3b",
      topBarVia: "#047857",
      topBarTo: "#059669",
    },
  },
  {
    id: "wildflower-herbal-farm",
    name: "Wildflower Herbs & Farmstead",
    category: "green",
    categoryLabel: "Plants & Nature",
    badgeIcon: Leaf,
    description: "Fresh flora & organic gardens: crisp farm green, lemon verbena & rich soil.",
    palette: {
      primary: "#16a34a",
      primaryDark: "#166534",
      secondary: "#84cc16",
      accent: "#ea580c",
      background: "#f0fdf4",
      backgroundDark: "#06180c",
      surface: "#dcfce7",
      surfaceDark: "#0e3019",
      topBarFrom: "#166534",
      topBarVia: "#16a34a",
      topBarTo: "#22c55e",
    },
  },
  {
    id: "zen-bamboo-bonsai",
    name: "Zen Bamboo & Bonsai Garden",
    category: "green",
    categoryLabel: "Plants & Bonsai",
    badgeIcon: Sprout,
    description: "Kyoto botanical garden: tranquil aged bamboo, matcha moss & river stone.",
    palette: {
      primary: "#3f6212",
      primaryDark: "#1a2e05",
      secondary: "#65a30d",
      accent: "#eab308",
      background: "#f7fee7",
      backgroundDark: "#0a1404",
      surface: "#ecfccb",
      surfaceDark: "#162808",
      topBarFrom: "#1a2e05",
      topBarVia: "#3f6212",
      topBarTo: "#4d7c0f",
    },
  },

  // ── 8. Neon Cyberspace, Tech & Robotics
  {
    id: "neon-cyberspace-2077",
    name: "Neon Cyberspace 2077",
    category: "tech",
    categoryLabel: "Robotics & Cyberspace",
    badgeIcon: Bot,
    description: "Cyberpunk androids & robotics: electric laser neon-green, void black & cyber cyan.",
    palette: {
      primary: "#00ff88",
      primaryDark: "#059669",
      secondary: "#00f2fe",
      accent: "#ff007a",
      background: "#030712",
      backgroundDark: "#020408",
      surface: "#0f172a",
      surfaceDark: "#0a0f1d",
      topBarFrom: "#022c22",
      topBarVia: "#059669",
      topBarTo: "#00f2fe",
    },
  },
  {
    id: "quantum-robotics-matrix",
    name: "Quantum AI & Bionic Mecha",
    category: "tech",
    categoryLabel: "Robotics & Cyberspace",
    badgeIcon: Bot,
    description: "Autonomous mecha & AI: laser cyber-cyan, neural ultraviolet & synthetic pulse green.",
    palette: {
      primary: "#06b6d4",
      primaryDark: "#0891b2",
      secondary: "#8b5cf6",
      accent: "#10b981",
      background: "#040714",
      backgroundDark: "#02040a",
      surface: "#0b1329",
      surfaceDark: "#070c1a",
      topBarFrom: "#083344",
      topBarVia: "#0891b2",
      topBarTo: "#7c3aed",
    },
  },
  {
    id: "cyber-matrix-grid",
    name: "Cyber Matrix Terminal",
    category: "tech",
    categoryLabel: "Robotics & Cyberspace",
    badgeIcon: Zap,
    description: "Hacker terminal & mainframe: phosphor green CRT glow on pitch black.",
    palette: {
      primary: "#10b981",
      primaryDark: "#047857",
      secondary: "#22c55e",
      accent: "#38bdf8",
      background: "#ffffff",
      backgroundDark: "#030a06",
      surface: "#f0fdf4",
      surfaceDark: "#071f11",
      topBarFrom: "#047857",
      topBarVia: "#059669",
      topBarTo: "#10b981",
    },
  },
];

const STORE_TYPES = [
  { value: "electronics", label: "Electronics & Tech Devices" },
  { value: "plants", label: "🌿 Plants, Houseplants & Eco Nursery" },
  { value: "robotics", label: "🤖 Robotics, AI Hardware & Cyberspace" },
  { value: "jewelry", label: "Jewelry, Watches & Luxury Goods" },
  { value: "clothing", label: "Fashion Apparel & Clothing Boutique" },
  { value: "restaurant", label: "Restaurant & Fine Dining Gourmet" },
  { value: "bakery", label: "Bakery, Patisserie & Confectionery" },
  { value: "coffee", label: "Coffee Shop & Specialty Roastery" },
  { value: "grocery", label: "Grocery & Organic Farm Store" },
  { value: "furniture", label: "Furniture & Modern Interior Design" },
  { value: "books", label: "Books, Art & Literary Goods" },
  { value: "beauty", label: "Beauty, Skincare & Cosmetics" },
  { value: "sports", label: "Sports, Fitness & Outdoors" },
  { value: "general", label: "General Retail Merchandise" },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($) - US Dollar" },
  { value: "EUR", label: "EUR (€) - Euro" },
  { value: "GBP", label: "GBP (£) - British Pound" },
  { value: "BDT", label: "BDT (৳) - Bangladeshi Taka" },
  { value: "INR", label: "INR (₹) - Indian Rupee" },
  { value: "CAD", label: "CAD ($) - Canadian Dollar" },
  { value: "AUD", label: "AUD ($) - Australian Dollar" },
  { value: "JPY", label: "JPY (¥) - Japanese Yen" },
  { value: "CNY", label: "CNY (¥) - Chinese Yuan" },
];

const TIMEZONES = [
  { value: "Asia/Dhaka", label: "Asia/Dhaka (GMT+6)" },
  { value: "America/New_York", label: "America/New_York (EST)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST)" },
  { value: "Europe/London", label: "Europe/London (GMT)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST)" },
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
];

const SOCIAL_PLATFORMS = [
  { value: "Facebook", label: "Facebook" },
  { value: "Twitter/X", label: "Twitter / X" },
  { value: "Instagram", label: "Instagram" },
  { value: "LinkedIn", label: "LinkedIn" },
  { value: "YouTube", label: "YouTube" },
  { value: "TikTok", label: "TikTok" },
  { value: "Pinterest", label: "Pinterest" },
  { value: "Vimeo", label: "Vimeo" },
  { value: "Discord", label: "Discord" },
  { value: "RSS", label: "RSS Feed" },
];

// ── Reusable HeroUI Select Component ──────────────────────────────────────────
function HeroUISelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  className = "",
}: {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}) {
  const currentOption = options.find((opt) => opt.value === value);

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-xs font-semibold text-[var(--foreground)]">
          {label}
        </label>
      )}
      <Select
        selectedKey={value || null}
        onSelectionChange={(key) => {
          if (key !== null && key !== undefined) {
            onChange(String(key));
          }
        }}
        placeholder={placeholder}
        aria-label={label || placeholder}
      >
        <Select.Trigger className="w-full h-10 px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)] text-xs font-semibold text-[var(--foreground)] flex items-center justify-between gap-1.5 cursor-pointer hover:border-primary transition-colors shadow-2xs outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20">
          <Select.Value className="text-xs truncate font-medium text-[var(--foreground)]">
            {({ selectedText, isPlaceholder }) => (
              <span className={isPlaceholder ? "text-[var(--foreground-muted)]" : "text-[var(--foreground)] font-semibold"}>
                {selectedText || currentOption?.label || placeholder}
              </span>
            )}
          </Select.Value>
          <Select.Indicator className="text-[var(--foreground-muted)] shrink-0" />
        </Select.Trigger>
        <Select.Popover className="min-w-[var(--trigger-width)] w-full p-1.5 bg-[var(--surface-elevated)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
          <ListBox className="outline-hidden space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <ListBox.Item
                  key={opt.value}
                  id={opt.value}
                  textValue={opt.label}
                  className={`text-xs font-medium px-3 py-2 rounded-lg cursor-pointer flex items-center justify-between transition-colors outline-hidden ${
                    isSelected
                      ? "bg-primary text-white font-bold"
                      : "text-[var(--foreground)] hover:bg-primary/10 hover:text-primary"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                </ListBox.Item>
              );
            })}
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}

// ── HeroUI Card Container Helper ──────────────────────────────────────────────
function SettingCard({
  title,
  subtitle,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={`border border-[var(--border-color)] shadow-xs bg-[var(--surface-elevated)] rounded-2xl overflow-hidden transition-all ${className}`}
    >
      <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border-color)]/80 bg-[var(--surface-alt)]/50">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--foreground)]">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-[var(--foreground-muted)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="p-6 space-y-5">{children}</div>
    </Card>
  );
}

// ── Color Field Helper ────────────────────────────────────────────────────────
function ColorPickerRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-xl border border-[var(--border-color)] cursor-pointer bg-transparent p-0.5 shrink-0"
        />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

// ── Color Math Helpers for Auto-Harmonization ─────────────────────────────────
function shadeHex(color: string, percent: number): string {
  let hex = color.replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(hex, 16);
  let r = (num >> 16) + Math.round(255 * (percent / 100));
  let g = ((num >> 8) & 0x00ff) + Math.round(255 * (percent / 100));
  let b = (num & 0x0000ff) + Math.round(255 * (percent / 100));

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// ── Contrast Text Color (Light vs Dark mode accessibility) ───────────────────
function getContrastTextColor(hexColor: string): string {
  let hex = (hexColor || "#000000").replace("#", "");
  if (hex.length === 3) {
    hex = hex.split("").map((c) => c + c).join("");
  }
  const num = parseInt(hex, 16);
  if (isNaN(num)) return "#ffffff";
  const r = num >> 16;
  const g = (num >> 8) & 0x00ff;
  const b = num & 0x0000ff;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 135 ? "#0f172a" : "#ffffff";
}

interface AdminSettingsClientProps {
  initialSettings?: SiteSettingsData;
}

export default function AdminSettingsClient({
  initialSettings,
}: AdminSettingsClientProps) {
  const { settings: globalSettings, updateSettings } = useSiteSettings();
  const current = initialSettings || globalSettings;

  const [activeTab, setActiveTab] = useState("identity");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  // ── Custom Presets State (Persisted in localStorage) ──
  const [customPresets, setCustomPresets] = useState<ThemePreset[]>([]);
  const [customPaletteName, setCustomPaletteName] = useState("My Boutique Brand");
  const [customSeedColor, setCustomSeedColor] = useState("#b45309");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("sparq_custom_palettes");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Restore Wand2 as the badgeIcon component so it is never an empty serialized object
          const sanitized: ThemePreset[] = parsed.map((p: any) => ({
            ...p,
            badgeIcon: Wand2,
          }));
          setCustomPresets(sanitized);
        }
      }
    } catch {}
  }, []);

  const saveCustomPresetToStorage = (newPresets: ThemePreset[]) => {
    setCustomPresets(newPresets);
    try {
      // Strip React component references before JSON serialization
      const serializable = newPresets.map(({ badgeIcon, ...rest }) => rest);
      localStorage.setItem("sparq_custom_palettes", JSON.stringify(serializable));
    } catch {}
  };

  // ── 1. Identity & Meta State ──
  const [siteName, setSiteName] = useState(current.siteName || "Sparq");
  const [siteTagline, setSiteTagline] = useState(
    current.siteTagline || "Better products. A brighter you."
  );
  const [storeType, setStoreType] = useState(current.storeType || "electronics");
  const [metaTitle, setMetaTitle] = useState(
    current.metaTitle || "Sparq - Premium Online Store"
  );
  const [metaDescription, setMetaDescription] = useState(
    current.metaDescription ||
      "Sparq - Premium Worldwide Store with best deals, fast shipping, and top-tier products."
  );

  // ── 2. Typography State ──
  const [primaryFont, setPrimaryFont] = useState(
    current.typography?.primaryFont || "Open Sans"
  );
  const [headingFont, setHeadingFont] = useState(
    current.typography?.headingFont || "Poppins"
  );

  // ── 3. Theme & Colors State ──
  const [colors, setColors] = useState<SiteColorPalette>({
    primary: current.colorPalette?.primary || "#0284c7",
    primaryDark: current.colorPalette?.primaryDark || "#0369a1",
    secondary: current.colorPalette?.secondary || "#6366f1",
    accent: current.colorPalette?.accent || "#f59e0b",
    background: current.colorPalette?.background || "#ffffff",
    backgroundDark: current.colorPalette?.backgroundDark || "#0b0f19",
    surface: current.colorPalette?.surface || "#f8fafc",
    surfaceDark: current.colorPalette?.surfaceDark || "#131d2e",
    topBarFrom: current.colorPalette?.topBarFrom || "#1d4ed8",
    topBarVia: current.colorPalette?.topBarVia || "#0284c7",
    topBarTo: current.colorPalette?.topBarTo || "#4338ca",
  });

  // ── 4. Shipping & Delivery Costs State ──
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(
    current.shipping?.freeShippingEnabled ?? true
  );
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(
    current.shipping?.freeShippingThreshold ?? 50
  );
  const [standardDeliveryFee, setStandardDeliveryFee] = useState(
    current.shipping?.standardDeliveryFee ?? 15
  );
  const [expressDeliveryFee, setExpressDeliveryFee] = useState(
    current.shipping?.expressDeliveryFee ?? 25
  );
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(
    current.shipping?.estimatedDeliveryDays || "2-4 business days"
  );

  // ── 5. Top Bar State ──
  const [topBarEnabled, setTopBarEnabled] = useState(
    current.topBarEnabled ?? true
  );
  const [topBarText, setTopBarText] = useState(
    current.topBarText ||
      "Welcome to Worldwide Store • Free Express Shipping on $50+"
  );
  const [topBarItems, setTopBarItems] = useState<SiteTopBarItem[]>(
    current.topBarItems || [
      { label: "Store Locator", href: "/store-locator" },
      { label: "Track Order", href: "/track-order" },
    ]
  );

  // ── 5b. Phone Menu Placement ──
  const [mobileMenuPlacement, setMobileMenuPlacement] =
    useState<MobileMenuPlacement>(
      (current.mobileMenuPlacement as MobileMenuPlacement) || "middle"
    );

  // ── 6. Logos & Branding State ──
  const [logoType, setLogoType] = useState<"both" | "img" | "text">(
    current.logoType || "both"
  );
  const [navbarLogoLight, setNavbarLogoLight] = useState(
    current.navbarLogo?.light || ""
  );
  const [navbarLogoDark, setNavbarLogoDark] = useState(
    current.navbarLogo?.dark || ""
  );
  const [footerLogoLight, setFooterLogoLight] = useState(
    current.footerLogo?.light || ""
  );
  const [footerLogoDark, setFooterLogoDark] = useState(
    current.footerLogo?.dark || ""
  );
  const [faviconUrl, setFaviconUrl] = useState(current.faviconUrl || "");

  // ── 6b. Homepage Brand Marquee ──
  // One row per logo that scrolls across the homepage. Empty by default, so a
  // fresh store never shows brands it does not work with.
  const [brandLogos, setBrandLogos] = useState<SiteBrandLogo[]>(
    current.brandLogos || []
  );

  // ── 7. Contact & Socials State ──
  const [supportEmail, setSupportEmail] = useState(
    current.supportEmail || "support@sparq.com"
  );
  const [contactEmail, setContactEmail] = useState(
    current.contactEmail || "contact@sparq.com"
  );
  const [supportPhone, setSupportPhone] = useState(
    current.supportPhone || "(800) 8001-8588"
  );
  const [openingHours, setOpeningHours] = useState(
    current.openingHours || "Mon - Fri: 9:00 AM - 8:00 PM"
  );
  const [address, setAddress] = useState(
    current.address || "17 Princess Road, London, Greater London NW1 8JR, UK"
  );
  const [socialLinks, setSocialLinks] = useState<SiteSocialLink[]>(
    current.socialLinks && current.socialLinks.length > 0
      ? current.socialLinks
      : [
          { platform: "Facebook", url: "" },
          { platform: "Twitter/X", url: "" },
          { platform: "Instagram", url: "" },
        ]
  );

  // ── 7b. About Page Content State ──
  // Left empty when the owner has not customised a line: the About page then
  // shows its built-in text, so clearing a field restores the default.
  const [aboutHeadline, setAboutHeadline] = useState(
    current.about?.headline || ""
  );
  const [aboutIntro, setAboutIntro] = useState(current.about?.intro || "");
  const [aboutHeadquartersNote, setAboutHeadquartersNote] = useState(
    current.about?.headquartersNote || ""
  );
  const [aboutHoursNote, setAboutHoursNote] = useState(
    current.about?.openingHoursNote || ""
  );
  const [aboutCtaTitle, setAboutCtaTitle] = useState(
    current.about?.ctaTitle || ""
  );
  const [aboutCtaDescription, setAboutCtaDescription] = useState(
    current.about?.ctaDescription || ""
  );

  // ── 8. System & Security State ──
  const [currency, setCurrency] = useState(current.currency || "USD");
  const currencySymbol = getCurrencySymbol(currency);
  const [timezone, setTimezone] = useState(current.timezone || "Asia/Dhaka");
  const [maintenanceMode, setMaintenanceMode] = useState(
    current.maintenanceMode || false
  );
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [footerCopyright, setFooterCopyright] = useState(
    current.footerCopyright || ""
  );

  // ── Maintenance Mode: instant real-time toggle (saves immediately, no Publish required) ──
  const handleToggleMaintenance = async (isSelected: boolean) => {
    setMaintenanceMode(isSelected);
    setSavingMaintenance(true);
    try {
      const res = await updateSiteSettings({ maintenanceMode: isSelected });
      if (res?.success === false) {
        toast.error(res.message || "Failed to update maintenance mode.");
        setMaintenanceMode(!isSelected); // rollback
      } else {
        updateSettings({ maintenanceMode: isSelected });
        toast.success(
          isSelected
            ? "⚠️ Store maintenance mode activated! Public routes are now blocked."
            : "✅ Maintenance mode deactivated. Store is live!"
        );
      }
    } catch {
      toast.error("An error occurred while updating maintenance mode.");
      setMaintenanceMode(!isSelected); // rollback
    } finally {
      setSavingMaintenance(false);
    }
  };
  // ── Helpers & Real-Time Sync ──
  const setColor = (key: keyof SiteColorPalette, val: string) => {
    setColors((prev) => {
      const next = { ...prev, [key]: val };
      updateSettings({ colorPalette: next });
      return next;
    });
  };

  const applyPreset = (preset: ThemePreset) => {
    const nextPalette = { ...preset.palette };
    setColors(nextPalette);
    updateSettings({ colorPalette: nextPalette });
    toast.info(`Applied "${preset.name}" palette to live preview!`);
  };

  // Direct real-time save of palette to DB
  const handleSavePaletteToDB = async (
    paletteToSave: SiteColorPalette = colors,
    label = "Color Palette"
  ) => {
    startTransition(async () => {
      try {
        const res = await updateSiteSettings({ colorPalette: paletteToSave });
        if (res?.success === false) {
          toast.error(res.message || "Failed to save palette to database.");
        } else {
          updateSettings({ colorPalette: paletteToSave });
          toast.success(`"${label}" saved to database successfully!`);
        }
      } catch (err) {
        toast.error("Error saving palette to database.");
      }
    });
  };

  const handlePrimaryFontChange = (val: string) => {
    setPrimaryFont(val);
    updateSettings({
      typography: {
        primaryFont: val,
        headingFont,
        baseFontSize: current.typography?.baseFontSize || "16px",
      },
    });
  };

  const handleHeadingFontChange = (val: string) => {
    setHeadingFont(val);
    updateSettings({
      typography: {
        primaryFont,
        headingFont: val,
        baseFontSize: current.typography?.baseFontSize || "16px",
      },
    });
  };

  // Auto Harmonize from Base Seed Color
  const handleAutoHarmonize = () => {
    const base = customSeedColor;
    const darker = shadeHex(base, -25);
    const lighter = shadeHex(base, 25);
    const accentColor = shadeHex(base, 45);

    const generated: SiteColorPalette = {
      primary: base,
      primaryDark: darker,
      secondary: lighter,
      accent: accentColor,
      background: "#ffffff",
      backgroundDark: "#0b0f19",
      surface: "#f8fafc",
      surfaceDark: "#151c2c",
      topBarFrom: darker,
      topBarVia: base,
      topBarTo: lighter,
    };

    setColors(generated);
    updateSettings({ colorPalette: generated });
    toast.success("Harmonious custom palette generated and applied in real time!");
  };

  // Save Custom Palette to Custom Presets
  const handleSaveCustomPalette = () => {
    if (!customPaletteName.trim()) {
      toast.error("Please enter a name for your custom palette.");
      return;
    }

    const newPreset: ThemePreset = {
      id: `custom-${Date.now()}`,
      name: customPaletteName.trim(),
      category: "custom",
      categoryLabel: "Custom Created",
      badgeIcon: Wand2,
      description: `Created for ${siteName}. Custom primary ${colors.primary}.`,
      palette: { ...colors },
    };

    const updated = [newPreset, ...customPresets];
    saveCustomPresetToStorage(updated);
    toast.success(`Saved "${customPaletteName}" to your custom presets!`);
  };

  // Delete Custom Preset
  const handleDeleteCustomPreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPresets.filter((p) => p.id !== presetId);
    saveCustomPresetToStorage(updated);
    toast.info("Custom palette removed.");
  };

  const addTopBarItem = () =>
    setTopBarItems((prev) => [...prev, { label: "", href: "" }]);
  const removeTopBarItem = (idx: number) =>
    setTopBarItems((prev) => prev.filter((_, i) => i !== idx));
  const updateTopBarItem = (idx: number, field: "label" | "href", val: string) =>
    setTopBarItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it))
    );

  const addSocialLink = () =>
    setSocialLinks((prev) => [...prev, { platform: "Facebook", url: "" }]);
  const removeSocialLink = (idx: number) =>
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));
  const updateSocialLink = (
    idx: number,
    field: "platform" | "url",
    val: string
  ) =>
    setSocialLinks((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it))
    );

  const addBrandLogo = () =>
    setBrandLogos((prev) => [...prev, { name: "", logo: "", href: "" }]);
  const removeBrandLogo = (idx: number) =>
    setBrandLogos((prev) => prev.filter((_, i) => i !== idx));
  const updateBrandLogo = (idx: number, patch: Partial<SiteBrandLogo>) =>
    setBrandLogos((prev) =>
      prev.map((brand, i) => (i === idx ? { ...brand, ...patch } : brand))
    );

  const topBarGradient = `linear-gradient(to right, ${colors.topBarFrom}, ${colors.topBarVia}, ${colors.topBarTo})`;

  // Combine Default Presets with User's Custom Presets
  const allPresets = [...customPresets, ...DEFAULT_THEME_PRESETS];
  const filteredPresets =
    selectedCategoryFilter === "all"
      ? allPresets
      : allPresets.filter((p) => p.category === selectedCategoryFilter);

  // ── Save All Changes ──
  const handleSave = () => {
    startTransition(async () => {
      try {
        const payload = {
          siteName,
          siteTagline,
          storeType,
          metaTitle,
          metaDescription,
          typography: {
            primaryFont,
            headingFont,
          },
          colorPalette: colors,
          shipping: {
            freeShippingEnabled,
            freeShippingThreshold: Number(freeShippingThreshold) || 0,
            standardDeliveryFee: Number(standardDeliveryFee) || 0,
            expressDeliveryFee: Number(expressDeliveryFee) || 0,
            estimatedDeliveryDays,
          },
          topBarEnabled,
          topBarText,
          topBarItems: topBarItems.filter((i) => i.label.trim()),
          mobileMenuPlacement,
          logoType,
          navbarLogo: {
            light: navbarLogoLight,
            dark: navbarLogoDark,
          },
          footerLogo: {
            light: footerLogoLight,
            dark: footerLogoDark,
          },
          faviconUrl,
          supportEmail,
          contactEmail,
          supportPhone,
          openingHours,
          address,
          about: {
            headline: aboutHeadline.trim(),
            intro: aboutIntro.trim(),
            headquartersNote: aboutHeadquartersNote.trim(),
            openingHoursNote: aboutHoursNote.trim(),
            ctaTitle: aboutCtaTitle.trim(),
            ctaDescription: aboutCtaDescription.trim(),
          },
          socialLinks: socialLinks.filter((s) => s.platform.trim()),
          // Rows left blank are dropped, so an empty line never becomes a gap
          // in the scrolling band.
          brandLogos: brandLogos
            .map((brand) => ({
              name: (brand.name || "").trim(),
              logo: (brand.logo || "").trim(),
              href: (brand.href || "").trim(),
            }))
            .filter((brand) => brand.name || brand.logo),
          currency,
          timezone,
          maintenanceMode,
          footerCopyright,
        };

        const res = await updateSiteSettings(payload);

        if (res?.success === false) {
          toast.error(res.message || "Failed to save site settings.");
        } else {
          updateSettings(payload as unknown as Partial<SiteSettingsData>);
          toast.success("Site settings updated and published successfully!");
        }
      } catch (err) {
        console.error(err);
        toast.error("An error occurred while saving.");
      }
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground-muted)] mb-1">
            <Link
              href="/dashboard/admin"
              className="hover:text-primary transition-colors"
            >
              Admin Dashboard
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-primary">Site Settings</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
            Site{" "}
            <span className="text-gradient-primary">
              Settings &amp; Branding
            </span>
          </h1>
          <p className="text-xs md:text-sm text-[var(--foreground-muted)] mt-1">
            Full control over store branding, Google fonts, custom color palette creation, dual-theme logos, and delivery stats.
          </p>
        </div>

        <Button
          onClick={handleSave}
          isDisabled={isPending}
          className="bg-primary text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-md shadow-primary/25 inline-flex items-center gap-2 cursor-pointer hover:opacity-95 transition-all self-start sm:self-auto shrink-0"
        >
          {isPending ? (
            <span className="w-4 h-4 border-2 border-[var(--surface-elevated)]/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isPending ? "Publishing..." : "Publish Changes"}
        </Button>
      </div>

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[var(--border-color)] scrollbar-none">
        {SETTING_TABS.map((tab) => {
          const isValidTabIcon =
            tab.icon &&
            (typeof tab.icon === "function" ||
              (typeof tab.icon === "object" && Boolean((tab.icon as any)?.$$typeof)));
          const Icon = isValidTabIcon ? tab.icon : Settings;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-xs shadow-[var(--accent)]/20"
                  : "text-[var(--foreground-secondary)] dark:text-[var(--foreground-muted)] hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--surface)]/60"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 1: IDENTITY & META
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "identity" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingCard
            title="Store & Brand Identity"
            subtitle="Change site name, slogan, or switch store category with HeroUI Select"
            icon={Globe}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Site Name
              </label>
              <Input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Sparq, Velvet & Co, Cafe Noir, Golden Crust"
              />
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Shown in navbar, footer, metadata, and browser tab.
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Slogan / Tagline
              </label>
              <Input
                type="text"
                value={siteTagline}
                onChange={(e) => setSiteTagline(e.target.value)}
                placeholder="e.g. Better products. A brighter you."
              />
            </div>

            {/* HeroUI Select for Store Type */}
            <HeroUISelect
              label="Store Type / Industry"
              value={storeType}
              onChange={(val) => setStoreType(val)}
              options={STORE_TYPES}
              placeholder="Select store industry"
            />
          </SettingCard>

          <SettingCard
            title="SEO & Metadata"
            subtitle="Control browser title and description for search engines & social shares"
            icon={Type}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Meta Title
              </label>
              <Input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Page title shown on Google"
              />
              <span className="text-[11px] text-[var(--foreground-muted)]">
                {metaTitle.length}/60 characters recommended
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Meta Description
              </label>
              <TextArea
                rows={4}
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Brief summary of your store for search engine snippets"
              />
              <span className="text-[11px] text-[var(--foreground-muted)]">
                {metaDescription.length}/160 characters recommended
              </span>
            </div>
          </SettingCard>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 2: TYPOGRAPHY & GOOGLE FONTS
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "fonts" && (
        <div className="space-y-6">
          <SettingCard
            title="Curated Google Fonts"
            subtitle="Choose Google Fonts for body text and headings across your storefront"
            icon={Type}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* HeroUI Select for Primary Font */}
              <HeroUISelect
                label="Primary Font (Body & UI)"
                value={primaryFont}
                onChange={handlePrimaryFontChange}
                options={GOOGLE_FONTS.map((f) => ({
                  value: f.name,
                  label: `${f.name} (${f.category})`,
                }))}
                placeholder="Choose primary font"
              />

              {/* HeroUI Select for Heading Font */}
              <HeroUISelect
                label="Heading Font (Titles & Hero)"
                value={headingFont}
                onChange={handleHeadingFontChange}
                options={GOOGLE_FONTS.map((f) => ({
                  value: f.name,
                  label: `${f.name} (${f.category})`,
                }))}
                placeholder="Choose heading font"
              />
            </div>

            {/* Live Typography Preview Card */}
            <Card className="rounded-2xl border border-[var(--border-color)] p-6 bg-[var(--surface-alt)] space-y-4 shadow-2xs">
              <span className="text-[10px] font-bold tracking-wider text-primary uppercase">
                Live Font Preview
              </span>
              <div
                style={{
                  fontFamily: `'${headingFont}', sans-serif`,
                }}
              >
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[var(--foreground)]">
                  {siteName} — {siteTagline}
                </h2>
              </div>
              <p
                className="text-sm text-[var(--foreground-secondary)] leading-relaxed"
                style={{
                  fontFamily: `'${primaryFont}', sans-serif`,
                }}
              >
                Discover our hand-crafted collection with fast express delivery and seamless checkout.
                This sentence is rendered live in your selected primary font ({primaryFont}),
                while the title above is styled in {headingFont}.
              </p>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  className="bg-[var(--accent)] text-[var(--on-accent)] text-xs font-bold px-4 py-2 rounded-xl shadow-xs"
                  style={{ fontFamily: `'${primaryFont}', sans-serif` }}
                >
                  Shop Now
                </Button>
                <span className="text-xs text-[var(--foreground-muted)]">
                  Heading: <strong className="text-[var(--foreground-secondary)]">{headingFont}</strong> • Body:{" "}
                  <strong className="text-[var(--foreground-secondary)]">{primaryFont}</strong>
                </span>
              </div>
            </Card>
          </SettingCard>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 3: THEME & COLOR PALETTES (WITH CUSTOM PALETTE CREATOR STUDIO)
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "colors" && (
        <div className="space-y-6">
          {/* ── Studio: Create Your Own Custom Palette ── */}
          <SettingCard
            title="Custom Palette Creator Studio"
            subtitle="Design, auto-harmonize, and save your own custom color scheme"
            icon={Wand2}
          >
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[var(--accent)]/10 via-[var(--surface-elevated)] to-[var(--surface-elevated)] border border-[var(--accent)]/20 dark:border-[var(--border-color)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex-1 max-w-sm flex flex-col gap-1">
                  <label className="text-xs font-bold text-[var(--foreground)]">
                    Palette Name
                  </label>
                  <Input
                    type="text"
                    value={customPaletteName}
                    onChange={(e) => setCustomPaletteName(e.target.value)}
                    placeholder="e.g. Royal Amethyst, Pastel Peach"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--foreground-secondary)]">
                      Seed Color:
                    </span>
                    <input
                      type="color"
                      value={customSeedColor}
                      onChange={(e) => setCustomSeedColor(e.target.value)}
                      className="w-9 h-9 rounded-xl border border-[var(--border-color)] cursor-pointer p-0.5"
                    />
                  </div>

                  <Button
                    onClick={handleAutoHarmonize}
                    className="bg-[var(--surface-elevated)] border border-[var(--border-color)] text-[var(--foreground)] text-xs font-bold px-4 py-2 rounded-xl shadow-2xs hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--foreground-muted)] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-primary" />
                    Auto-Harmonize
                  </Button>

                  <Button
                    onClick={handleSaveCustomPalette}
                    className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" />
                    Save to My Presets
                  </Button>
                </div>
              </div>

              {/* Real-Time Live Preview of Custom Palette */}
              <div className="pt-3 border-t border-[var(--border-color)]/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary block mb-2">
                  Live Custom Palette Preview
                </span>
                <div
                  className="rounded-xl px-4 py-2.5 text-white text-xs font-semibold flex items-center justify-between shadow-2xs"
                  style={{ background: topBarGradient }}
                >
                  <span>Announcement Banner in Custom Gradient</span>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-3 py-1 rounded-lg font-extrabold text-[11px] shadow-sm transition-colors border border-black/10 dark:border-white/20"
                      style={{
                        background: colors.primary,
                        color: getContrastTextColor(colors.primary),
                      }}
                    >
                      Primary Button
                    </span>
                    <span
                      className="px-3 py-1 rounded-lg font-extrabold text-[11px] shadow-sm transition-colors border border-black/10 dark:border-white/20"
                      style={{
                        background: colors.accent,
                        color: getContrastTextColor(colors.accent),
                      }}
                    >
                      Accent Badge
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </SettingCard>

          {/* Preset Palettes with Category Filter */}
          <SettingCard
            title="Industry Color Palettes & Saved Presets"
            subtitle="Curated professional color schemes for Jewelry, Fashion, Restaurant, Bakery, Coffee Shop, and Tech"
            icon={Palette}
          >
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: "all", label: "All Palettes" },
                { id: "custom", label: `✨ My Custom (${customPresets.length})` },
                { id: "jewelry", label: "💎 Jewelry & Luxury" },
                { id: "fashion", label: "👗 Fashion & Clothes" },
                { id: "restaurant", label: "🍷 Restaurant & Dining" },
                { id: "bakery", label: "🥐 Bakery & Pastry" },
                { id: "coffee", label: "☕ Coffee Shop" },
                { id: "green", label: "🌿 Plants & Eco" },
                { id: "tech", label: "⚡ Electronics & Tech" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setSelectedCategoryFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                    selectedCategoryFilter === pill.id
                      ? "bg-[var(--accent)] text-[var(--on-accent)] shadow-xs ring-2 ring-[var(--accent)]/20"
                      : "bg-[var(--surface-alt)] text-[var(--foreground-secondary)] dark:text-[var(--foreground)] border border-[var(--border-color)]/80 dark:border-[var(--border-color)] hover:bg-[var(--surface-alt)] dark:hover:bg-[var(--foreground-muted)]/80 shadow-2xs"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2">
              {filteredPresets.map((preset) => {
                const isValidIcon =
                  preset.badgeIcon &&
                  (typeof preset.badgeIcon === "function" ||
                    (typeof preset.badgeIcon === "object" && Boolean((preset.badgeIcon as any)?.$$typeof)));
                const isCustom = preset.category === "custom";
                const IconComponent = isValidIcon
                  ? preset.badgeIcon!
                  : isCustom
                  ? Wand2
                  : Palette;
                const isActive = colors.primary === preset.palette.primary;
                const pColor = preset.palette.primary;
                const textColor = getContrastTextColor(pColor);

                return (
                  <div
                    key={preset.id}
                    onClick={() => applyPreset(preset)}
                    style={{
                      "--preset-p": pColor,
                    } as React.CSSProperties}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer bg-[var(--surface-elevated)] group relative hover:-translate-y-1 ${
                      isActive
                        ? "border-[var(--preset-p)] ring-2 ring-[var(--preset-p)]/30 shadow-md shadow-[var(--preset-p)]/20"
                        : "border-[var(--border-color)] hover:border-[var(--preset-p)] hover:shadow-xl hover:shadow-[var(--preset-p)]/25"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 shadow-2xs"
                          style={{
                            backgroundColor: `${pColor}20`,
                            color: pColor,
                          }}
                        >
                          <IconComponent className="w-3.5 h-3.5" />
                        </div>
                        <h4 className="text-xs font-bold text-[var(--foreground)] transition-colors group-hover:text-[var(--preset-p)]">
                          {preset.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isActive && (
                          <span
                            className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-2xs mr-0.5"
                            style={{
                              backgroundColor: pColor,
                              color: textColor,
                            }}
                          >
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Active
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            applyPreset(preset);
                          }}
                          className="text-[11px] font-bold hover:underline cursor-pointer transition-colors px-1.5 py-0.5"
                          style={{ color: pColor }}
                        >
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            applyPreset(preset);
                            handleSavePaletteToDB(preset.palette, preset.name);
                          }}
                          disabled={isPending}
                          className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-xs transition-all cursor-pointer hover:opacity-90 active:scale-95"
                          style={{
                            backgroundColor: pColor,
                            color: textColor,
                          }}
                        >
                          Save
                        </button>
                        {isCustom && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPreset(preset.id, e)}
                            className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                            title="Delete custom preset"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Category Badge Themed with Preset's Own Color */}
                    <span
                      className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md mb-2 shadow-2xs border transition-colors"
                      style={{
                        backgroundColor: `${pColor}18`,
                        color: pColor,
                        borderColor: `${pColor}40`,
                      }}
                    >
                      {preset.categoryLabel}
                    </span>

                    <p className="text-[11px] text-[var(--foreground-secondary)] mb-3 line-clamp-2 font-medium leading-relaxed">
                      {preset.description}
                    </p>

                    {/* Color Swatches with interactive hover effects */}
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full ring-1 ring-black/20 dark:ring-white/20 shrink-0 shadow-2xs transition-transform group-hover:scale-110"
                        style={{ background: preset.palette.primary }}
                        title={`Primary: ${preset.palette.primary}`}
                      />
                      <span
                        className="w-5 h-5 rounded-full ring-1 ring-black/20 dark:ring-white/20 shrink-0 shadow-2xs transition-transform group-hover:scale-110"
                        style={{ background: preset.palette.secondary }}
                        title={`Secondary: ${preset.palette.secondary}`}
                      />
                      <span
                        className="w-5 h-5 rounded-full ring-1 ring-black/20 dark:ring-white/20 shrink-0 shadow-2xs transition-transform group-hover:scale-110"
                        style={{ background: preset.palette.accent }}
                        title={`Accent: ${preset.palette.accent}`}
                      />
                      <div
                        className="flex-1 h-5 rounded-md ml-1 ring-1 ring-black/10 dark:ring-white/10 transition-transform group-hover:scale-[1.02]"
                        style={{
                          background: `linear-gradient(to right, ${preset.palette.topBarFrom}, ${preset.palette.topBarVia}, ${preset.palette.topBarTo})`,
                        }}
                        title="Top Bar Gradient"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </SettingCard>

          {/* Granular Color Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SettingCard title="Brand Colors" icon={Palette}>
              <ColorPickerRow
                label="Primary Brand"
                value={colors.primary}
                onChange={(v) => setColor("primary", v)}
              />
              <ColorPickerRow
                label="Primary Dark"
                value={colors.primaryDark}
                onChange={(v) => setColor("primaryDark", v)}
              />
              <ColorPickerRow
                label="Secondary"
                value={colors.secondary}
                onChange={(v) => setColor("secondary", v)}
              />
              <ColorPickerRow
                label="Accent"
                value={colors.accent}
                onChange={(v) => setColor("accent", v)}
              />
            </SettingCard>

            <SettingCard title="Surfaces & Backgrounds" icon={Palette}>
              <ColorPickerRow
                label="Light Background"
                value={colors.background}
                onChange={(v) => setColor("background", v)}
              />
              <ColorPickerRow
                label="Dark Background"
                value={colors.backgroundDark}
                onChange={(v) => setColor("backgroundDark", v)}
              />
              <ColorPickerRow
                label="Light Surface"
                value={colors.surface}
                onChange={(v) => setColor("surface", v)}
              />
              <ColorPickerRow
                label="Dark Surface"
                value={colors.surfaceDark}
                onChange={(v) => setColor("surfaceDark", v)}
              />
            </SettingCard>

            <SettingCard title="Top Bar Gradient" icon={Sparkles}>
              <ColorPickerRow
                label="Gradient From"
                value={colors.topBarFrom}
                onChange={(v) => setColor("topBarFrom", v)}
              />
              <ColorPickerRow
                label="Gradient Via"
                value={colors.topBarVia}
                onChange={(v) => setColor("topBarVia", v)}
              />
              <ColorPickerRow
                label="Gradient To"
                value={colors.topBarTo}
                onChange={(v) => setColor("topBarTo", v)}
              />
              <div className="pt-2">
                <span className="text-[10px] text-[var(--foreground-muted)] block mb-1">
                  Resulting Gradient:
                </span>
                <div
                  className="h-8 rounded-xl shadow-xs"
                  style={{ background: topBarGradient }}
                />
              </div>
            </SettingCard>
          </div>

          {/* Quick Save Palette to DB Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--accent)]/10 dark:bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <div>
              <p className="text-xs font-bold text-[var(--foreground)]">
                Save Palette Directly to Database
              </p>
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Immediately updates and persists your active light & dark color palette to MongoDB.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => handleSavePaletteToDB(colors, "Custom Palette")}
              isDisabled={isPending}
              className="bg-primary hover:bg-primary-hover text-white font-bold text-xs rounded-xl px-4 py-2 shadow-sm inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isPending ? "Saving..." : "Save Palette to DB"}
            </Button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 4: SHIPPING & DELIVERY COSTS
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "shipping" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingCard
            title="Shipping Rates & Thresholds"
            subtitle="Configure free shipping threshold, standard delivery cost, and express delivery fee"
            icon={Truck}
          >
            {/* Free Shipping Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)]/40 border border-[var(--border-color)]/60">
              <div>
                <p className="text-xs font-bold text-[var(--foreground)]">
                  Enable Free Shipping
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Waive shipping fees when order subtotal meets threshold
                </p>
              </div>
              <Switch
                isSelected={freeShippingEnabled}
                onChange={(isSelected) => setFreeShippingEnabled(isSelected)}
                className="cursor-pointer"
              >
                <Switch.Content className="cursor-pointer">
                  <Switch.Control className="cursor-pointer">
                    <Switch.Thumb className="cursor-pointer" />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Free Shipping Threshold (${currency})
              </label>
              <Input
                type="number"
                min="0"
                step="1"
                value={String(freeShippingThreshold)}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                placeholder="50"
              />
              <p className="text-[11px] text-[var(--foreground-muted)]">
                Orders over ${freeShippingThreshold} receive free express shipping.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                  Standard Delivery Fee (${currency})
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={String(standardDeliveryFee)}
                  onChange={(e) => setStandardDeliveryFee(Number(e.target.value))}
                  placeholder="15"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                  Express Delivery Fee (${currency})
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={String(expressDeliveryFee)}
                  onChange={(e) => setExpressDeliveryFee(Number(e.target.value))}
                  placeholder="25"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Estimated Delivery Duration
              </label>
              <Input
                type="text"
                value={estimatedDeliveryDays}
                onChange={(e) => setEstimatedDeliveryDays(e.target.value)}
                placeholder="e.g. 2-4 business days"
              />
            </div>
          </SettingCard>

          <SettingCard
            title="Customer View Preview"
            subtitle="How delivery information and free shipping thresholds appear to shoppers"
            icon={Eye}
          >
            <Card className="p-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/5 space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-primary font-bold text-xs">
                <Truck className="w-4 h-4" />
                <span>
                  {freeShippingEnabled
                    ? `Free Shipping on Orders ${currencySymbol}${freeShippingThreshold}+`
                    : `Standard Delivery Fee: ${currencySymbol}${standardDeliveryFee}`}
                </span>
              </div>
              <p className="text-xs text-[var(--foreground-secondary)]">
                Estimated Delivery: <strong>{estimatedDeliveryDays}</strong>
              </p>
              <div className="text-[11px] text-[var(--foreground-muted)] space-y-1 border-t border-[var(--accent)]/20 pt-2">
                <p>• Cart subtotal &gt;= {currencySymbol}{freeShippingThreshold} → {currencySymbol}0.00 Free Delivery</p>
                <p>• Standard orders → {currencySymbol}{standardDeliveryFee.toFixed(2)} Delivery</p>
                <p>• Express upgrade → {currencySymbol}{expressDeliveryFee.toFixed(2)} Delivery</p>
              </div>
            </Card>
          </SettingCard>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 5: TOP BAR & LAYOUT
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "topbar" && (
        <div className="space-y-6">
          <SettingCard
            title="Announcement Bar"
            subtitle="Top header announcement text and custom navigation links"
            icon={Sparkles}
          >
            {/* Live Gradient Preview */}
            <div className="rounded-xl overflow-hidden shadow-xs border border-[var(--border-color)]">
              <div
                className="px-4 py-2 text-white text-xs font-medium flex items-center justify-between gap-3"
                style={{ background: topBarGradient }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--surface-elevated)]/20 text-[10px] font-bold">
                    Deals
                  </span>
                  <span className="truncate">
                    {topBarText || `Welcome to ${siteName} • Free Shipping on $${freeShippingThreshold}+`}
                  </span>
                </div>
                <span className="text-[10px] opacity-75 shrink-0">Live Preview</span>
              </div>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)]/40 border border-[var(--border-color)]/60">
              <div>
                <p className="text-xs font-bold text-[var(--foreground)]">
                  Show Top Header Bar
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  Display announcement bar on public customer pages
                </p>
              </div>
              <Switch
                isSelected={topBarEnabled}
                onChange={(isSelected) => setTopBarEnabled(isSelected)}
                className="cursor-pointer"
              >
                <Switch.Content className="cursor-pointer">
                  <Switch.Control className="cursor-pointer">
                    <Switch.Thumb className="cursor-pointer" />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Announcement Text
              </label>
              <Input
                type="text"
                value={topBarText}
                onChange={(e) => setTopBarText(e.target.value)}
                placeholder={`Welcome to ${siteName} • Free Express Shipping on $50+`}
              />
            </div>
          </SettingCard>

          <SettingCard
            title="Top Bar Action Links"
            subtitle="Custom links shown on the right side of the top announcement bar"
            icon={Globe}
          >
            <div className="space-y-3">
              {topBarItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateTopBarItem(idx, "label", e.target.value)}
                    placeholder="Label (e.g. Store Locator)"
                  />
                  <Input
                    type="text"
                    value={item.href}
                    onChange={(e) => updateTopBarItem(idx, "href", e.target.value)}
                    placeholder="URL (e.g. /store-locator)"
                  />
                  <button
                    type="button"
                    onClick={() => removeTopBarItem(idx)}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                onClick={addTopBarItem}
                className="w-full border-2 border-dashed border-[var(--border-color)] text-[var(--foreground-muted)] hover:border-primary hover:text-primary bg-transparent text-xs font-bold rounded-xl py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Top Bar Link
              </Button>
            </div>
          </SettingCard>

          <SettingCard
            title="Phone Menu Button"
            subtitle="Small screens carry one hamburger — pick the panel it opens"
            icon={Menu}
          >
            <div className="space-y-4">
              {/* Live preview: the bar with its single button, then the panel
                  that choice unfolds under it. */}
              <div className="flex flex-col rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--surface-alt)]/40">
                <div className="flex items-center gap-1.5 px-2.5 py-2 bg-[var(--surface-elevated)] border-b border-[var(--border-color)]/70">
                  <span className="h-2 w-8 rounded-full bg-[var(--border-color)]" />
                  <span className="h-4 flex-1 rounded-full border border-[var(--border-color)] bg-[var(--surface)]" />
                  <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-primary text-white">
                    <Menu className="w-3 h-3" />
                  </span>
                </div>
                <div className="relative h-20 p-2">
                  <div
                    className={`absolute inset-y-2 flex items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-[10px] font-bold uppercase tracking-wide text-primary transition-all duration-200 ${
                      mobileMenuPlacement === "middle"
                        ? "inset-x-2"
                        : mobileMenuPlacement === "right"
                        ? "right-2 left-1/2"
                        : "left-2 right-1/2"
                    }`}
                  >
                    {mobileMenuPlacement === "middle"
                      ? "Full screen"
                      : `${mobileMenuPlacement === "right" ? "Right" : "Left"} drawer`}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                  Hamburger Opens
                </label>
                <AppSelect
                  ariaLabel="Phone menu placement"
                  value={mobileMenuPlacement}
                  onChange={(value) =>
                    setMobileMenuPlacement(
                      (value || "middle") as MobileMenuPlacement
                    )
                  }
                  options={MOBILE_MENU_PLACEMENTS.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                />
                <p className="text-[11px] text-[var(--foreground-muted)] mt-1">
                  {
                    MOBILE_MENU_PLACEMENTS.find(
                      (p) => p.value === mobileMenuPlacement
                    )?.note
                  }
                </p>
              </div>
            </div>
          </SettingCard>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 6: LOGOS & DUAL-THEME MEDIA
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10/60 dark:bg-[var(--accent)]/5 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--accent)]">
              Upload separate logos for <strong>Light Theme</strong> and <strong>Dark Theme</strong>, for both Navbar and Footer.
              Choose <strong>Image Only</strong> to show a logo graphic, <strong>Text Only</strong> for a typographic wordmark, or <strong>Image + Text</strong> for both together.
              Logos are hosted via ImgBB — use PNG or SVG with transparent backgrounds for best results.
            </p>
          </div>

          {/* Logo Format Selector */}
          <SettingCard
            title="Logo Display Format"
            subtitle="Choose whether your logo displays an uploaded image, custom text, or both together"
            icon={Sparkles}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: "both",
                  title: "Image + Text",
                  desc: "Uploaded logo graphic alongside your custom brand wordmark text",
                },
                {
                  id: "img",
                  title: "Image Only",
                  desc: "Standalone logo graphic — no adjacent text shown",
                },
                {
                  id: "text",
                  title: "Text Only",
                  desc: "Clean typographic wordmark using your heading font",
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setLogoType(opt.id as "both" | "img" | "text")}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    logoType === opt.id
                      ? "border-primary bg-[var(--accent)]/10/50 dark:bg-[var(--accent)]/10 shadow-xs"
                      : "border-[var(--border-color)] hover:border-[var(--border-color)] dark:hover:border-[var(--border-color)] bg-[var(--surface-elevated)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[var(--foreground)]">
                      {opt.title}
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                        logoType === opt.id
                          ? "border-primary bg-[var(--accent)]"
                          : "border-[var(--border-color)] dark:border-[var(--border-color)]"
                      }`}
                    >
                      {logoType === opt.id && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--surface-elevated)]" />
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--foreground-muted)]">
                    {opt.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Text Wordmark Input — shown for "both" or "text" mode */}
            {(logoType === "both" || logoType === "text") && (
              <div className="mt-5 pt-4 border-t border-[var(--border-color)] space-y-2">
                <label className="text-xs font-semibold text-[var(--foreground-secondary)] block">
                  Brand Wordmark Text
                </label>
                <Input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="e.g. Sparq, Velvet & Co, Matcha Bloom"
                />
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  This is the text rendered as your logo wordmark — rendered in your selected heading font (<strong>{headingFont}</strong>).
                </p>

                {/* Live text wordmark preview */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] flex items-center gap-2.5 shadow-2xs">
                    <span className="text-[10px] text-[var(--foreground-muted)] font-semibold shrink-0 uppercase tracking-wider">Light</span>
                    <span
                      className="text-xl font-black tracking-tight text-[var(--foreground)] leading-none truncate"
                      style={{ fontFamily: `'${headingFont}', sans-serif` }}
                    >
                      {siteName || "YourBrand"}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center gap-2.5 shadow-2xs">
                    <span className="text-[10px] text-[var(--foreground-muted)] font-semibold shrink-0 uppercase tracking-wider">Dark</span>
                    <span
                      className="text-xl font-black tracking-tight text-white leading-none truncate"
                      style={{ fontFamily: `'${headingFont}', sans-serif` }}
                    >
                      {siteName || "YourBrand"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </SettingCard>

          {/* Navbar Logo Uploads */}
          {(logoType === "img" || logoType === "both") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SettingCard
                title="Navbar Logo — Light Theme"
                subtitle="Recommended: 160×40px (PNG or SVG, transparent background)"
                icon={ImageIcon}
              >
                <ImageUploader
                  label="Upload Light Theme Navbar Logo"
                  value={navbarLogoLight}
                  onChange={setNavbarLogoLight}
                  urlPlaceholder="https://.../logo-light.png"
                />

                {/* Navbar Light Preview */}
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <span className="text-[10px] font-bold tracking-wider text-primary uppercase block mb-2">
                    Navbar Preview — Light Theme
                  </span>
                  <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] flex items-center gap-3 shadow-2xs">
                    {navbarLogoLight ? (
                      <Image
                        src={navbarLogoLight}
                        alt="Navbar Light"
                        width={140}
                        height={36}
                        className="max-h-9 w-auto object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-[var(--foreground-muted)] italic">No logo uploaded yet — placeholder shown</span>
                    )}
                    {logoType === "both" && (
                      <span
                        className="text-lg font-black tracking-tight text-[var(--foreground)] leading-none"
                        style={{ fontFamily: `'${headingFont}', sans-serif` }}
                      >
                        {siteName}
                      </span>
                    )}
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title="Navbar Logo — Dark Theme"
                subtitle="Recommended: 160×40px (PNG or SVG, transparent background). Leave blank to reuse light logo."
                icon={ImageIcon}
              >
                <ImageUploader
                  label="Upload Dark Theme Navbar Logo"
                  value={navbarLogoDark}
                  onChange={setNavbarLogoDark}
                  urlPlaceholder="https://.../logo-dark.png"
                />

                {/* Navbar Dark Preview */}
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <span className="text-[10px] font-bold tracking-wider text-primary uppercase block mb-2">
                    Navbar Preview — Dark Theme
                  </span>
                  <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center gap-3 shadow-2xs">
                    {(navbarLogoDark || navbarLogoLight) ? (
                      <Image
                        src={navbarLogoDark || navbarLogoLight}
                        alt="Navbar Dark"
                        width={140}
                        height={36}
                        className="max-h-9 w-auto object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-[var(--foreground-secondary)] italic">No logo uploaded — will fallback to light logo</span>
                    )}
                    {logoType === "both" && (
                      <span
                        className="text-lg font-black tracking-tight text-white leading-none"
                        style={{ fontFamily: `'${headingFont}', sans-serif` }}
                      >
                        {siteName}
                      </span>
                    )}
                  </div>
                </div>
              </SettingCard>
            </div>
          )}

          {/* Footer Logo Uploads */}
          {(logoType === "img" || logoType === "both") && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SettingCard
                title="Footer Logo — Light Theme"
                subtitle="Recommended: 200×50px (PNG or SVG, transparent background)"
                icon={ImageIcon}
              >
                <ImageUploader
                  label="Upload Light Theme Footer Logo"
                  value={footerLogoLight}
                  onChange={setFooterLogoLight}
                  urlPlaceholder="https://.../footer-light.png"
                />

                {/* Footer Light Preview */}
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <span className="text-[10px] font-bold tracking-wider text-primary uppercase block mb-2">
                    Footer Preview — Light Theme
                  </span>
                  <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] flex items-center gap-3 shadow-2xs">
                    {footerLogoLight ? (
                      <Image
                        src={footerLogoLight}
                        alt="Footer Light"
                        width={200}
                        height={50}
                        className="max-h-12 w-auto object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-[var(--foreground-muted)] italic">No footer logo uploaded yet</span>
                    )}
                    {logoType === "both" && (
                      <span
                        className="text-base font-black tracking-tight text-[var(--foreground)] leading-none"
                        style={{ fontFamily: `'${headingFont}', sans-serif` }}
                      >
                        {siteName}
                      </span>
                    )}
                  </div>
                </div>
              </SettingCard>

              <SettingCard
                title="Footer Logo — Dark Theme"
                subtitle="Recommended: 200×50px (PNG or SVG, transparent background). Leave blank to reuse light logo."
                icon={ImageIcon}
              >
                <ImageUploader
                  label="Upload Dark Theme Footer Logo"
                  value={footerLogoDark}
                  onChange={setFooterLogoDark}
                  urlPlaceholder="https://.../footer-dark.png"
                />

                {/* Footer Dark Preview */}
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <span className="text-[10px] font-bold tracking-wider text-primary uppercase block mb-2">
                    Footer Preview — Dark Theme
                  </span>
                  <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center gap-3 shadow-2xs">
                    {(footerLogoDark || footerLogoLight) ? (
                      <Image
                        src={footerLogoDark || footerLogoLight}
                        alt="Footer Dark"
                        width={200}
                        height={50}
                        className="max-h-12 w-auto object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="text-xs text-[var(--foreground-secondary)] italic">No logo uploaded — will fallback to light logo</span>
                    )}
                    {logoType === "both" && (
                      <span
                        className="text-base font-black tracking-tight text-white leading-none"
                        style={{ fontFamily: `'${headingFont}', sans-serif` }}
                      >
                        {siteName}
                      </span>
                    )}
                  </div>
                </div>
              </SettingCard>
            </div>
          )}

          {/* Text-only mode — no logo uploads needed, just the wordmark preview */}
          {logoType === "text" && (
            <SettingCard
              title="Text Wordmark Preview"
              subtitle="Your brand name is rendered in your heading font as the logo across the site"
              icon={Type}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Navbar-sized text preview */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Navbar Size</span>
                  <div className="p-3 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] flex items-center gap-2 shadow-2xs">
                    <span className="text-[10px] text-[var(--foreground-muted)] uppercase shrink-0">☀</span>
                    <span className="text-xl font-black tracking-tight text-[var(--foreground)] leading-none" style={{ fontFamily: `'${headingFont}', sans-serif` }}>
                      {siteName || "YourBrand"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center gap-2 shadow-2xs">
                    <span className="text-[10px] text-[var(--foreground-secondary)] uppercase shrink-0">🌙</span>
                    <span className="text-xl font-black tracking-tight text-white leading-none" style={{ fontFamily: `'${headingFont}', sans-serif` }}>
                      {siteName || "YourBrand"}
                    </span>
                  </div>
                </div>
                {/* Footer-sized text preview */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground-muted)]">Footer Size</span>
                  <div className="p-4 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-color)] flex items-center gap-2 shadow-2xs">
                    <span className="text-[10px] text-[var(--foreground-muted)] uppercase shrink-0">☀</span>
                    <span className="text-base font-black tracking-tight text-[var(--foreground)] leading-none" style={{ fontFamily: `'${headingFont}', sans-serif` }}>
                      {siteName || "YourBrand"}
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border-color)] flex items-center gap-2 shadow-2xs">
                    <span className="text-[10px] text-[var(--foreground-secondary)] uppercase shrink-0">🌙</span>
                    <span className="text-base font-black tracking-tight text-white leading-none" style={{ fontFamily: `'${headingFont}', sans-serif` }}>
                      {siteName || "YourBrand"}
                    </span>
                  </div>
                </div>
              </div>
            </SettingCard>
          )}

          {/* Favicon Upload */}
          <SettingCard
            title="Browser Favicon"
            subtitle="Recommended dimensions: 32×32px — ICO, PNG, JPG, WEBP, SVG or GIF"
            icon={Globe}
          >
            <ImageUploader
              label="Upload Favicon"
              value={faviconUrl}
              onChange={setFaviconUrl}
              urlPlaceholder="https://.../favicon.png"
            />
            {faviconUrl && (
              <div className="flex items-center gap-3 mt-3 p-3 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)]/40 border border-[var(--border-color)]/60">
                <Image
                  src={faviconUrl}
                  alt="Favicon Preview"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-md object-contain border border-[var(--border-color)]"
                  unoptimized
                />
                <div>
                  <p className="text-xs font-semibold text-[var(--foreground-secondary)]">Favicon Preview at 32×32px</p>
                  <p className="text-[11px] text-[var(--foreground-muted)]">Shown in browser tabs and bookmarks</p>
                </div>
              </div>
            )}
          </SettingCard>

          {/* Homepage brand marquee */}
          <SettingCard
            title="Homepage Brand Marquee"
            subtitle="The partner and supplier logos that scroll across the homepage"
            icon={ImageIcon}
          >
            <div className="space-y-3">
              {brandLogos.length === 0 && (
                <p className="text-[11px] text-[var(--foreground-muted)] bg-[var(--surface-alt)] border border-[var(--border-color)] rounded-xl px-3 py-2">
                  No brands yet. The whole band stays hidden on the homepage
                  until you add one.
                </p>
              )}

              {brandLogos.map((brand, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-3 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--foreground-muted)] shrink-0 w-6">
                      #{idx + 1}
                    </span>
                    <Input
                      type="text"
                      value={brand.name}
                      onChange={(e) =>
                        updateBrandLogo(idx, { name: e.target.value })
                      }
                      placeholder="Brand name (used when no logo is uploaded)"
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeBrandLogo(idx)}
                      className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <ImageUploader
                    label="Brand Logo"
                    value={brand.logo}
                    onChange={(url) => updateBrandLogo(idx, { logo: url })}
                    urlPlaceholder="https://.../brand-logo.png"
                  />

                  <Input
                    type="text"
                    value={brand.href || ""}
                    onChange={(e) =>
                      updateBrandLogo(idx, { href: e.target.value })
                    }
                    placeholder="Link (optional) e.g. /shop?brand=acme"
                  />
                </div>
              ))}

              <Button
                type="button"
                onClick={addBrandLogo}
                className="w-full border-2 border-dashed border-[var(--border-color)] text-[var(--foreground-muted)] hover:border-primary hover:text-primary bg-transparent text-xs font-bold rounded-xl py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Brand Logo
              </Button>

              {/* Preview of the band with whatever is set right now */}
              {brandLogos.some((brand) => brand.logo || brand.name) && (
                <div className="pt-3 border-t border-[var(--border-color)]">
                  <span className="text-[10px] font-bold tracking-wider text-primary uppercase block mb-2">
                    Preview
                  </span>
                  <div className="p-4 rounded-xl bg-[var(--surface-alt)] border border-[var(--border-color)] overflow-x-auto">
                    <div className="flex items-center gap-10 min-w-max text-slate-400 dark:text-[var(--foreground-muted)]">
                      {brandLogos
                        .filter((brand) => brand.logo || brand.name)
                        .map((brand, i) => (
                          <BrandLogoMark key={i} brand={brand} />
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </SettingCard>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 7: CONTACT & SOCIALS
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "contact" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingCard
            title="Store Contact Details"
            subtitle="Customer support hotline, email, and storefront address"
            icon={Phone}
          >
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Support Phone / Hotline
              </label>
              <Input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                placeholder="(800) 8001-8588"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Customer Support Email (Support & Orders)
              </label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@sparq.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                General Contact Email (Inquiries & Business)
              </label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="contact@sparq.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Opening Days & Hours
              </label>
              {/* TextArea so each day can sit on its own line. */}
              <TextArea
                rows={3}
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="Mon - Fri: 9:00 AM - 8:00 PM"
              />
              <p className="text-[10px] text-[var(--foreground-muted)]">
                Shown on the About page and the store footer. Use a new line for
                each day, e.g. "Mon - Thu: 9 AM - 8 PM" then "Fri - Sat: 10 AM - 6 PM".
              </p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Physical Address
              </label>
              <TextArea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="17 Princess Road, London, UK"
              />
            </div>
          </SettingCard>

          <SettingCard
            title="About Page Content"
            subtitle="Headlines, story and call-to-action shown on /about"
            icon={FileText}
          >
            <p className="text-[11px] text-[var(--foreground-muted)] leading-relaxed">
              Leave a field empty to keep the built-in text. Opening hours, address
              and phone/email come from the Store Contact Details card above.
            </p>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Page Headline
              </label>
              <Input
                type="text"
                value={aboutHeadline}
                onChange={(e) => setAboutHeadline(e.target.value)}
                placeholder="We Provide High Quality Products"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Intro Paragraph
              </label>
              <TextArea
                rows={4}
                value={aboutIntro}
                onChange={(e) => setAboutIntro(e.target.value)}
                placeholder="Welcome to our store, your number one destination for..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Headquarters Note (under the address)
              </label>
              <Input
                type="text"
                value={aboutHeadquartersNote}
                onChange={(e) => setAboutHeadquartersNote(e.target.value)}
                placeholder="Official Storefront & Support Center"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Opening Hours Note (under the hours)
              </label>
              <Input
                type="text"
                value={aboutHoursNote}
                onChange={(e) => setAboutHoursNote(e.target.value)}
                placeholder="Live helpline & in-store customer assistance"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Call-to-Action Title
              </label>
              <Input
                type="text"
                value={aboutCtaTitle}
                onChange={(e) => setAboutCtaTitle(e.target.value)}
                placeholder="Ready to explore our latest arrivals?"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Call-to-Action Text
              </label>
              <TextArea
                rows={2}
                value={aboutCtaDescription}
                onChange={(e) => setAboutCtaDescription(e.target.value)}
                placeholder="Browse our wide selection of new arrivals, bestsellers, and everyday essentials today."
              />
            </div>
          </SettingCard>

          <SettingCard
            title="Social Media Links"
            subtitle="Channels displayed in footer and mobile navigation"
            icon={Globe}
          >
            <div className="space-y-3">
              {socialLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-40 shrink-0">
                    <HeroUISelect
                      value={link.platform}
                      onChange={(val) => updateSocialLink(idx, "platform", val)}
                      options={SOCIAL_PLATFORMS}
                      placeholder="Platform"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="url"
                      value={link.url}
                      onChange={(e) => updateSocialLink(idx, "url", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSocialLink(idx)}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                onClick={addSocialLink}
                className="w-full border-2 border-dashed border-[var(--border-color)] text-[var(--foreground-muted)] hover:border-primary hover:text-primary bg-transparent text-xs font-bold rounded-xl py-2.5 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Social Link
              </Button>
            </div>
          </SettingCard>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────────────
          TAB 8: SYSTEM & SECURITY
      ────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "system" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SettingCard
            title="Localization & Store Config"
            subtitle="Currency and timezone settings"
            icon={Settings}
          >
            {/* HeroUI Select for Currency */}
            <HeroUISelect
              label="Store Currency"
              value={currency}
              onChange={(val) => setCurrency(val)}
              options={CURRENCIES}
              placeholder="Select currency"
            />

            {/* HeroUI Select for Timezone */}
            <HeroUISelect
              label="Store Timezone"
              value={timezone}
              onChange={(val) => setTimezone(val)}
              options={TIMEZONES}
              placeholder="Select timezone"
            />

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-[var(--foreground-secondary)]">
                Custom Footer Copyright
              </label>
              <Input
                type="text"
                value={footerCopyright}
                onChange={(e) => setFooterCopyright(e.target.value)}
                placeholder={`© ${new Date().getFullYear()} ${siteName}. All rights reserved.`}
              />
            </div>
          </SettingCard>

          <SettingCard
            title="Operating Mode"
            subtitle="Toggle maintenance mode — changes take effect immediately, no Save required"
            icon={Shield}
          >
            <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--surface-alt)] dark:bg-[var(--surface-alt)]/40 border border-[var(--border-color)]/60">
              <div>
                <p className="text-xs font-bold text-[var(--foreground)]">
                  Maintenance Mode
                </p>
                <p className="text-[11px] text-[var(--foreground-muted)]">
                  When active, non-admin visitors will see a maintenance page
                </p>
              </div>
              <div className="flex items-center gap-2">
                {savingMaintenance && (
                  <span className="text-[11px] text-[var(--foreground-muted)] animate-pulse">
                    Saving…
                  </span>
                )}
                <Switch
                  isSelected={maintenanceMode}
                  onChange={(isSelected) => handleToggleMaintenance(isSelected)}
                  isDisabled={savingMaintenance}
                  className="cursor-pointer"
                >
                  <Switch.Content className="cursor-pointer">
                    <Switch.Control className="cursor-pointer">
                      <Switch.Thumb className="cursor-pointer" />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              </div>
            </div>

            {maintenanceMode ? (
              <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Maintenance mode is ACTIVE — public store is blocked.</span>
                </div>
                <a
                  href="/maintenance?preview=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] px-2.5 py-1 rounded-full border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-950/30 transition shrink-0 whitespace-nowrap"
                >
                  Preview Page ↗
                </a>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Store is live and operational — maintenance mode is OFF.</span>
              </div>
            )}
          </SettingCard>
        </div>
      )}

      {/* ── Sticky Bottom Publish Bar ── */}
      <div className="fixed bottom-4 right-4 sm:right-10 z-40">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[var(--surface-elevated)]/90 dark:bg-[var(--surface-elevated)]/90 backdrop-blur-md border border-[var(--border-color)] shadow-xl shadow-black/10">
          <span className="text-xs text-[var(--foreground-muted)] hidden sm:inline">
            Unsaved changes?
          </span>
          <Button
            onClick={handleSave}
            isDisabled={isPending}
            className="bg-primary hover:from-sky-600 hover:to-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-primary/25 transition-all duration-200 cursor-pointer inline-flex items-center gap-2"
          >
            {isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-[var(--surface-elevated)]/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isPending ? "Publishing..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
