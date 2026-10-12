"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingCart, Sparkles } from "lucide-react";
import { SlideItem } from "@/types";

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
}

// Fallback image used when slide image fails to load
const FALLBACK_IMAGE =
  "https://i.ibb.co.com/Q3Tpt7Df/industries-consumer-electronics-removebg-preview.png";

// ─── Countdown Hook ──────────────────────────────────────────────────────────
function useCountdown(targetDate?: Date) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, ended: false });

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff > 0) {
        setTimeLeft({
          hours: Math.floor(diff / 3_600_000),
          minutes: Math.floor((diff / 60_000) % 60),
          seconds: Math.floor((diff / 1_000) % 60),
          ended: false,
        });
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, ended: true });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

// ─── Countdown Box ───────────────────────────────────────────────────────────
function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-2 border-primary rounded-md p-1.5 w-12 text-center bg-white dark:bg-gray-800 shadow-xs">
      <span className="block text-lg font-bold text-gray-800 dark:text-white leading-none">
        {String(value).padStart(2, "0")}
      </span>
      <span className="text-[9px] text-gray-500 dark:text-gray-400 uppercase font-semibold">{label}</span>
    </div>
  );
}

interface HeroSliderProps {
  initialSlides?: SlideItem[] | any[];
}

// ─── Main Slider ─────────────────────────────────────────────────────────────
export default function HeroSlider({ initialSlides = [] }: HeroSliderProps) {
  const slides: SlideData[] = useMemo(() => {
    if (!Array.isArray(initialSlides) || initialSlides.length === 0) {
      return [];
    }
    return initialSlides.map((s, idx) => {
      const target = s.targetDate ? new Date(s.targetDate) : new Date(Date.now() + 86400000);
      const validTarget = isNaN(target.getTime()) ? new Date(Date.now() + 86400000) : target;
      const priceStr =
        typeof s.price === "number"
          ? `$${s.price.toFixed(2)}`
          : s.price || "$0.00";
      const origPriceStr =
        typeof s.originalPrice === "number"
          ? `$${s.originalPrice.toFixed(2)}`
          : s.originalPrice;

      const displayName = s.productName || s.title || s.tabTitle || `OFFER ${idx + 1}`;

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

  // If no slides exist in the database
  if (slides.length === 0) {
    return (
      <div className="w-full">
        <div className="relative bg-gradient-to-br from-slate-50 via-sky-50/40 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 rounded-xl overflow-hidden border border-gray-200/80 dark:border-gray-800 p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[360px] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white">
              Discover Exclusive Tech Deals
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Browse our complete catalog of electronics, gadgets, and top accessories.
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md transition-all"
          >
            <span>Explore Shop</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const activeIndex = currentSlide < slides.length ? currentSlide : 0;
  const slide = slides[activeIndex];
  const { hours, minutes, seconds, ended: countdownEnded } = useCountdown(slide?.targetDate);

  return (
    <div className="w-full">
      <div
        className="relative bg-gradient-to-b from-[#f8f9fa] via-[#f3f4f6] to-[#eef0f3] dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 rounded-xl overflow-hidden border border-gray-200/80 dark:border-gray-800 shadow-xs"
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
            <h3 className="text-3xl md:text-4xl lg:text-5xl font-light text-gray-800 dark:text-gray-100 tracking-tight leading-none uppercase">
              {slide.subtitle?.split(" ")[0]} <br />
              <span className="font-bold">{slide.subtitle?.split(" ").slice(1).join(" ")}</span>
            </h3>
            <p className="text-xs font-semibold tracking-wider text-gray-500 dark:text-gray-300 uppercase">
              {slide.tagline}
            </p>
            <div className="pt-2">
              <Link
                href={slide.href}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all transform active:scale-95 group"
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
              <h4 className="text-base font-bold text-sky-600 dark:text-sky-400 group-hover:underline leading-tight">
                {slide.productName}
              </h4>
            </Link>

            <div className="flex items-baseline justify-center md:justify-start gap-2">
              <span className="text-3xl font-normal text-red-500 dark:text-red-400">{slide.price}</span>
              {slide.originalPrice && !countdownEnded && (
                <span className="text-sm text-gray-400 dark:text-gray-500 line-through">{slide.originalPrice}</span>
              )}
            </div>

            <div className="flex items-center justify-center md:justify-start gap-2 pt-1">
              <CountdownBox value={hours} label="HOURS" />
              <CountdownBox value={minutes} label="MINS" />
              <CountdownBox value={seconds} label="SECS" />
            </div>

            <div className="pt-1">
              <Link
                href={slide.href}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors"
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
            className="grid border-t border-gray-200/90 dark:border-gray-800 bg-white/90 dark:bg-gray-950/95 backdrop-blur-xs"
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
                    ? "bg-[#f3f4f6] dark:bg-gray-900/90 font-bold text-gray-900 dark:text-white"
                    : "hover:bg-gray-100/60 dark:hover:bg-gray-900/40 text-gray-500 dark:text-gray-400 font-medium"
                }`}
              >
                {activeIndex === i && (
                  <div className="absolute top-0 left-0 w-full">
                    <div className="h-[3px] w-full bg-primary" />
                    <div className="absolute top-[3px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-primary" />
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
