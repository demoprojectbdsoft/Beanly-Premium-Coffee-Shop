"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import { SiteSettingsData } from "@/types";
import { getCurrencySymbol, formatPrice as formatPriceUtil, CURRENCY_SYMBOLS } from "@/lib/currency";
export { getCurrencySymbol, CURRENCY_SYMBOLS };

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
  siteName: "Sparq",
  siteTagline: "Better products. A brighter you.",
  storeType: "electronics",
  supportEmail: "support@sparq.com",
  contactEmail: "contact@sparq.com",
  supportPhone: "(800) 8001-8588",
  openingHours: "Mon - Fri: 9:00 AM - 8:00 PM",
  address: "17 Princess Road, London, Greater London NW1 8JR, UK",
  metaTitle: "Sparq - Premium Online Store",
  metaDescription:
    "Sparq - Premium Worldwide Store with best deals, fast shipping, and top-quality products.",
  topBarText:
    "Welcome to our Worldwide Store • Free Express Shipping on $50+",
  topBarEnabled: true,
  topBarItems: [
    { label: "Store Locator", href: "/store-locator" },
    { label: "Track Order", href: "/track-order" },
  ],
  // One hamburger on a phone, and by default it opens the full-screen panel.
  mobileMenuPlacement: "middle",
  logoType: "both",
  navbarLogo: { light: "", dark: "" },
  footerLogo: { light: "", dark: "" },
  faviconUrl: "",
  colorPalette: {
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
  typography: {
    primaryFont: "Open Sans",
    headingFont: "Poppins",
    baseFontSize: "16px",
  },
  shipping: {
    freeShippingEnabled: true,
    freeShippingThreshold: 50,
    standardDeliveryFee: 15,
    expressDeliveryFee: 25,
    estimatedDeliveryDays: "2-4 business days",
  },
  socialLinks: [
    { platform: "Facebook", url: "#" },
    { platform: "Twitter/X", url: "#" },
    { platform: "Instagram", url: "#" },
  ],
  // No logos by default: the homepage band stays hidden until the owner adds
  // the ones their store actually works with.
  brandLogos: [],
  currency: "USD",
  timezone: "Asia/Dhaka",
  maintenanceMode: false,
  footerCopyright: "",
  about: {
    headline: "We Provide High Quality Products",
    intro: "",
    headquartersNote: "Official Storefront & Support Center",
    openingHoursNote: "Live helpline & in-store customer assistance",
    ctaTitle: "Ready to explore our latest arrivals?",
    ctaDescription:
      "Browse our wide selection of new arrivals, bestsellers, and everyday essentials today.",
  },
};

interface SiteSettingsContextType {
  settings: SiteSettingsData;
  updateSettings: (newSettings: Partial<SiteSettingsData>) => void;
  currencySymbol: string;
  formatPrice: (amount: number | string | undefined | null, opts?: { showDecimals?: boolean }) => string;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SITE_SETTINGS,
  updateSettings: () => {},
  currencySymbol: "$",
  formatPrice: (amt, opts) => formatPriceUtil(amt, "USD", opts),
});

export function SiteSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Partial<SiteSettingsData> | null;
}) {
  const [settings, setSettings] = useState<SiteSettingsData>(() => ({
    ...DEFAULT_SITE_SETTINGS,
    ...(initialSettings || {}),
    colorPalette: {
      ...DEFAULT_SITE_SETTINGS.colorPalette,
      ...(initialSettings?.colorPalette || {}),
    },
    typography: {
      ...DEFAULT_SITE_SETTINGS.typography,
      ...(initialSettings?.typography || {}),
    },
    shipping: {
      ...DEFAULT_SITE_SETTINGS.shipping,
      ...(initialSettings?.shipping || {}),
    },
    about: {
      ...DEFAULT_SITE_SETTINGS.about,
      ...(initialSettings?.about || {}),
    },
  }));

  const updateSettings = (newSettings: Partial<SiteSettingsData>) => {
    if (newSettings.currency && typeof window !== "undefined") {
      try {
        localStorage.setItem("customer_preferred_currency", newSettings.currency);
      } catch {}
    }
    setSettings((prev) => ({
      ...prev,
      ...newSettings,
      colorPalette: {
        ...prev.colorPalette,
        ...(newSettings.colorPalette || {}),
      },
      typography: {
        ...prev.typography,
        ...(newSettings.typography || {}),
      },
      shipping: {
        ...prev.shipping,
        ...(newSettings.shipping || {}),
      },
      about: {
        ...prev.about,
        ...(newSettings.about || {}),
      },
    }));
  };

  // Restore client-preferred currency if saved in localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCurrency = localStorage.getItem("customer_preferred_currency");
        if (savedCurrency) {
          setSettings((prev) => ({ ...prev, currency: savedCurrency }));
        }
      } catch {}
    }
  }, []);

  // Dynamically inject CSS variables when palette changes.
  // IMPORTANT: Only set --site-* intermediary tokens here.
  // Do NOT set derived tokens (--brand-flat, --surface, etc.) directly —
  // those are computed by globals.css color-mix() rules which handle light/dark
  // correctly. Setting them as inline styles would override .dark class rules.
  useEffect(() => {
    if (typeof document === "undefined" || !settings.colorPalette) return;
    const root = document.documentElement;
    const cp = settings.colorPalette;

    if (cp.primary)        root.style.setProperty("--site-primary",       cp.primary);
    if (cp.primaryDark)    root.style.setProperty("--site-primary-dark",   cp.primaryDark);
    if (cp.secondary)      root.style.setProperty("--site-secondary",      cp.secondary);
    if (cp.accent)         root.style.setProperty("--site-accent",         cp.accent);
    if (cp.background)     root.style.setProperty("--site-bg",             cp.background);
    if (cp.backgroundDark) root.style.setProperty("--site-bg-dark",        cp.backgroundDark);
    if (cp.surface)        root.style.setProperty("--site-surface",        cp.surface);
    if (cp.surfaceDark)    root.style.setProperty("--site-surface-dark",   cp.surfaceDark);
    if (cp.topBarFrom)     root.style.setProperty("--site-topbar-from",    cp.topBarFrom);
    if (cp.topBarVia)      root.style.setProperty("--site-topbar-via",     cp.topBarVia);
    if (cp.topBarTo)       root.style.setProperty("--site-topbar-to",      cp.topBarTo);
    // CSS globals.css color-mix() derives all other tokens (--brand-flat, --surface,
    // --surface-elevated, --surface-alt, --border-color, --brand-gradient, etc.)
    // automatically from the --site-* values set above, in the correct mode.
  }, [settings.colorPalette]);

  // Dynamically swap the favicon <link> tags when faviconUrl changes.
  // SSR metadata alone can't react to live admin edits, and browsers aggressively
  // cache favicons — so append a version query param to force a refetch.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const url = settings.faviconUrl;
    if (!url) return;

    const href = url.includes("?")
      ? `${url}&v=${encodeURIComponent(url)}`
      : `${url}?v=${encodeURIComponent(url)}`;

    // Match the MIME type to the file extension so SVG favicons work too.
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    const type =
      ext === "svg" ? "image/svg+xml" :
      ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp" || ext === "gif" ? "image/png" :
      "";

    const rels = ["icon", "shortcut icon"];
    rels.forEach((rel) => {
      let linkEl = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!linkEl) {
        linkEl = document.createElement("link");
        linkEl.rel = rel;
        document.head.appendChild(linkEl);
      }
      linkEl.href = href;
      if (type) linkEl.type = type;
    });
  }, [settings.faviconUrl]);

  // Dynamically load Google Fonts when typography changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const primary = settings.typography?.primaryFont || "Open Sans";
    const heading = settings.typography?.headingFont || "Poppins";

    const fontFamilies = Array.from(new Set([primary, heading]))
      .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, "+")}:wght@300;400;500;600;700;800`)
      .join("&");
    const href = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`;

    let linkEl = document.getElementById("dynamic-google-fonts") as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement("link");
      linkEl.id = "dynamic-google-fonts";
      linkEl.rel = "stylesheet";
      document.head.appendChild(linkEl);
    }
    linkEl.href = href;

    document.documentElement.style.setProperty("--site-font-primary", `'${primary}', sans-serif`);
    document.documentElement.style.setProperty("--site-font-heading", `'${heading}', sans-serif`);
    document.body.style.fontFamily = `'${primary}', sans-serif`;
  }, [settings.typography?.primaryFont, settings.typography?.headingFont]);

  const currencySymbol = useMemo(() => getCurrencySymbol(settings.currency), [settings.currency]);
  const formatPrice = useCallback(
    (amount: number | string | undefined | null, opts?: { showDecimals?: boolean }) =>
      formatPriceUtil(amount, settings.currency, opts),
    [settings.currency]
  );

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        currencySymbol,
        formatPrice,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    return {
      settings: DEFAULT_SITE_SETTINGS,
      updateSettings: () => {},
      currencySymbol: "$",
      formatPrice: (amt: number | string | undefined | null, opts?: { showDecimals?: boolean }) =>
        formatPriceUtil(amt, "USD", opts),
    };
  }
  return context;
}
