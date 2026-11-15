"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingCart, Sparkles } from "lucide-react";
import { SlideItem } from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { hasOfferDiscount } from "@/lib/offer";
import { padCountdown } from "@/lib/countdown";
import { useCountdown } from "@/hooks/useCountdown";

// ─── Types ─────────────────────────────────────────────────────────────────
export interface SlideData {
  id: string;
  tabTitle: string;
  subtitle: string;
  tagline: string;
  productName: string;
  price: string;
  originalPrice?: string;
  image: string;
  href: string;
  targetDate: Date;
  /** False when the slide has no real discount, so no countdown is shown. */
  hasDiscount: boolean;
}

// Fallback image used when slide image fails to load
const FALLBACK_IMAGE =
  "https://i.ibb.co.com/Q3Tpt7Df/industries-consumer-electronics-removebg-preview.png";

// ─── Countdown Box ───────────────────────────────────────────────────────────
// The box is sized by its content instead of a fixed width, so a 100+ hour
// deal keeps "HOURS" on one line and a three-digit number never pushes the
// label into a broken "HOUR / S" wrap.
function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[52px] shrink-0 flex-col items-center justify-center rounded-md border-2 border-primary bg-[var(--surface)] px-1.5 py-1.5 text-[var(--foreground)] shadow-xs">
      <span className="block text-lg font-bold leading-none tabular-nums text-[var(--foreground)]">
        {padCountdown(value)}
      </span>
      <span className="mt-0.5 block whitespace-nowrap text-[9px] font-semibold uppercase leading-none text-[var(--foreground-muted)]">
        {label}
      </span>
    </div>
  );
}

interface HeroSliderProps {
  initialSlides?: SlideItem[] | any[];
}

// ─── Main Slider ─────────────────────────────────────────────────────────────
export default function HeroSlider({ initialSlides = [] }: HeroSliderProps) {
  const { formatPrice, currencySymbol } = useSiteSettings();

  const slides: SlideData[] = useMemo(() => {
    if (!Array.isArray(initialSlides) || initialSlides.length === 0) {
      return [];
    }
    return initialSlides.map((s, idx) => {
      const target = s.targetDate ? new Date(s.targetDate) : new Date(Date.now() + 86400000);
      const validTarget = isNaN(target.getTime()) ? new Date(Date.now() + 86400000) : target;
      const priceStr =
        typeof s.price === "number"
          ? formatPrice(s.price)
          : s.price || `${currencySymbol}0.00`;
      const origPriceStr =
        typeof s.originalPrice === "number"
          ? formatPrice(s.originalPrice)
          : s.originalPrice;

      const displayName = s.productName || s.title || s.tabTitle || `OFFER ${idx + 1}`;

      // A slide whose prices match has no offer running, so it shows neither a
      // struck-through old price nor a countdown.
      const hasDiscount = hasOfferDiscount(s.price, s.originalPrice);

      return {
        id: s.id || s._id || `slide-${idx}`,
        tabTitle: displayName,
        subtitle: s.subtitle || "FEATURED DEAL",
        tagline: s.tagline || "SPECIAL OFFER FOR LIMITED TIME",
        productName: s.productName || s.title || "Featured Product",
        price: priceStr,
        originalPrice: origPriceStr,
        image: s.image || FALLBACK_IMAGE,
        href: s.href || "/shop",
        targetDate: validTarget,
        hasDiscount,
      };
    });
  }, [initialSlides]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance every 5 s, reset on manual tab click, pause on hover
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const id = setInterval(() => {
      setCurrentSlide((p) => (p + 1) % slides.length);
    }, 5000);
    return () => clearInterval(id);
  }, [currentSlide, isPaused, slides.length]);

  // Hooks run on every render, so the active slide and its timer are resolved
  // before the empty state can return early.
  const activeIndex = currentSlide < slides.length ? currentSlide : 0;
  const slide = slides[activeIndex];
  const countdown = useCountdown(slide?.targetDate);
  // The hero shows a single hours box, so a multi-day deal counts its days
  // into hours instead of resetting to 23 every evening.
  const totalHours = countdown.days * 24 + countdown.hours;

  // If no slides exist in the database
  if (slides.length === 0) {
    return (
      <div className="w-full">
        <div className="relative bg-[var(--surface-elevated)] rounded-2xl overflow-hidden border border-[var(--border-color)] p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[360px] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-xl font-extrabold text-[var(--foreground)]">
              Discover Exclusive Deals
            </h3>
            <p className="text-xs text-[var(--foreground-muted)]">
              Browse our complete catalog of products, new arrivals, and top accessories.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/25 transition-all"
          >
            <span>Explore Shop</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        className="relative bg-[var(--surface-elevated)] rounded-xl overflow-hidden border border-[var(--border-color)] shadow-xs transition-colors duration-200"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Main content grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 items-center min-h-[380px] p-6 md:p-10 gap-6">

          {/* Left – headline & tagline */}
          <div
            key={`left-${activeIndex}`}
            className="slide-anim-left md:col-span-4 space-y-3 text-center md:text-left"
          >
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-light text-[var(--foreground)] tracking-tight leading-none uppercase">
              {slide.subtitle?.split(" ")[0]} <br />
              <span className="font-bold">{slide.subtitle?.split(" ").slice(1).join(" ")}</span>
            </h3>
            <p className="text-xs font-semibold tracking-wider text-[var(--foreground-muted)] uppercase">
              {slide.tagline}
            </p>
            <div className="pt-2">
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-gradient text-[var(--on-grad-text)] text-xs font-bold shadow-brand hover:opacity-95 transition-all transform active:scale-95 group"
              >
                <span>Shop Now</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          {/* Center – product image */}
          <div className="md:col-span-5 flex justify-center items-center h-64 md:h-80">
            <Link
              key={`img-${activeIndex}`}
              href={slide.href}
              className="slide-anim-image w-full h-full max-w-[320px] flex items-center justify-center cursor-pointer group"
            >
              <img
                src={slide.image}
                alt={slide.productName}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  if (e.currentTarget.src !== FALLBACK_IMAGE) {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }
                }}
                className="object-contain max-h-full transition-transform duration-300 group-hover:scale-105 drop-shadow-md dark:drop-shadow-[0_4px_12px_rgba(255,255,255,0.08)]"
              />
            </Link>
          </div>

          {/* Right – product name, price, countdown */}
          <div
            key={`right-${activeIndex}`}
            className="slide-anim-right md:col-span-3 space-y-4 text-center md:text-left"
          >
            <Link href={slide.href} className="block group">
              <h4 className="text-base font-bold text-primary group-hover:underline leading-tight">
                {slide.productName}
              </h4>
            </Link>

            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-3xl font-normal text-red-500 dark:text-red-400">{slide.price}</span>
              {slide.originalPrice && slide.hasDiscount && !countdown.ended && (
                <span className="text-sm text-[var(--foreground-muted)] line-through">{slide.originalPrice}</span>
              )}
            </div>

            {slide.hasDiscount && !countdown.ended && (
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 pt-1">
                <CountdownBox value={totalHours} label="HOURS" />
                <CountdownBox value={countdown.minutes} label="MINS" />
                <CountdownBox value={countdown.seconds} label="SECS" />
              </div>
            )}

            <div className="pt-1">
              <Link
                href={slide.href}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--foreground)] hover:text-primary transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
                <span>View Product Details</span>
              </Link>
            </div>
          </div>

        </div>

        {/* Tab bar */}
        {slides.length > 1 && (
          <div
            className="grid border-t border-[var(--border-color)] bg-[var(--surface)]/90 backdrop-blur-xs"
            style={{
              gridTemplateColumns: `repeat(${Math.min(slides.length, 5)}, minmax(0, 1fr))`,
            }}
          >
            {slides.map((s, i) => (
              <button
                key={s.id || i}
                onClick={() => setCurrentSlide(i)}
                className={`relative px-3 py-4 text-center transition-all duration-200 cursor-pointer select-none ${
                  activeIndex === i
                    ? "bg-[var(--surface-alt)] font-bold text-[var(--foreground)]"
                    : "hover:bg-[var(--surface-alt)]/60 text-[var(--foreground-muted)] font-medium"
                }`}
              >
                {activeIndex === i && (
                  <div className="absolute top-0 left-0 w-full">
                    <div className="h-[3px] w-full bg-brand-gradient" />
                    <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[var(--brand-flat)]" />
                  </div>
                )}
                <span
                  title={s.productName || s.tabTitle}
                  className="text-[11px] font-bold leading-tight block uppercase tracking-tight pt-1 truncate px-1"
                >
                  {s.tabTitle}
                </span>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
