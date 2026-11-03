"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Sparkles, CheckCircle2, Sliders, ChevronDown, DollarSign, Percent, Star, Tag, Zap } from "lucide-react";
import { RadioGroup, Radio, Switch } from "@heroui/react";
import { ProductsSidebarFilterProps } from "@/types";
import { useSiteSettings } from "@/context/SiteSettingsContext";

const DISCOUNT_TABS = ["0-20", "20-40", "40-60", "60-80", "80-100"] as const;
const BADGE_OPTIONS = [
  { id: "new", label: "New" },
  { id: "hot", label: "Hot" },
  { id: "popular", label: "Popular" },
  { id: "trending", label: "Trending" },
  { id: "top-seller", label: "Top Seller" },
  { id: "value-of-the-day", label: "Value of the Day" },
] as const;
const RATING_OPTIONS = [4, 3, 2, 1] as const;

const MIN_PRICE = 0;
const MAX_PRICE = 2000;

export default function ProductsSidebarFilter({}: ProductsSidebarFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currencySymbol } = useSiteSettings();
  const [isPending, startTransition] = useTransition();
  const [isExpandedResponsive, setIsExpandedResponsive] = useState(false);

  // Read URL params
  const activeFeatured  = searchParams.get("isFeatured") === "true";
  const activeInStock   = searchParams.get("inStock") === "true";
  const activeHasOffer  = searchParams.get("hasOffer") === "true";
  const activeMinRating = Number(searchParams.get("minRating")) || 0;
  const activeBadge     = searchParams.get("badge") || "";
  const activeDiscount  = searchParams.get("discount") || "";
  const urlMin          = Number(searchParams.get("minPrice")) || MIN_PRICE;
  const urlMax          = Number(searchParams.get("maxPrice")) || MAX_PRICE;

  const [rangeMin, setRangeMin] = useState(urlMin);
  const [rangeMax, setRangeMax] = useState(urlMax);

  useEffect(() => { setRangeMin(urlMin); }, [urlMin]);
  useEffect(() => { setRangeMax(urlMax); }, [urlMax]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v) params.delete(k);
      else params.set(k, v);
    });
    params.delete("page");
    startTransition(() => router.push(`/shop?${params.toString()}`, { scroll: false }));
  };

  const hasActiveFilters = Boolean(
    activeFeatured || activeInStock || activeHasOffer || activeMinRating ||
    activeBadge || activeDiscount || urlMin > MIN_PRICE || urlMax < MAX_PRICE
  );

  const fillLeft  = ((rangeMin - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100;
  const fillRight = ((rangeMax - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100;

  const filterContent = (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
        <Filter className="w-4 h-4 text-primary" />
        <h2 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wide">Filters</h2>
        {hasActiveFilters && (
          <span className="ml-auto text-[10px] font-bold bg-primary text-white rounded-full px-2 py-0.5 leading-none">
            Active
          </span>
        )}
      </div>

      {/* Discount Range */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--border-color)]">
        <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
          <Percent className="w-3.5 h-3.5 text-primary" /> Discount
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DISCOUNT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => updateParams({ discount: activeDiscount === tab ? null : tab })}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeDiscount === tab
                  ? "bg-primary text-white shadow-xs"
                  : "text-[var(--foreground-muted)] hover:text-[var(--foreground)] border border-[var(--border-color)] hover:border-primary"
              }`}
            >
              {tab}%
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Slider */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
        <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-primary" /> Price Range
        </label>
        <div className="flex items-center justify-between text-xs font-semibold text-primary">
          <span>{currencySymbol}{rangeMin}</span>
          <span className="text-[10px] text-[var(--foreground-muted)]">—</span>
          <span>{currencySymbol}{rangeMax}</span>
        </div>
        <div className="relative h-5 flex items-center">
          <div className="absolute w-full h-1.5 rounded-full bg-[var(--surface-alt)]" />
          <div className="absolute h-1.5 rounded-full bg-primary" style={{ left: `${fillLeft}%`, right: `${100 - fillRight}%` }} />
          <input type="range" min={MIN_PRICE} max={MAX_PRICE} step={10} value={rangeMin}
            onChange={(e) => setRangeMin(Math.min(Number(e.target.value), rangeMax - 10))}
            className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer range-thumb"
          />
          <input type="range" min={MIN_PRICE} max={MAX_PRICE} step={10} value={rangeMax}
            onChange={(e) => setRangeMax(Math.max(Number(e.target.value), rangeMin + 10))}
            className="absolute w-full h-1.5 appearance-none bg-transparent cursor-pointer range-thumb"
          />
        </div>
        <button
          type="button"
          onClick={() => updateParams({ minPrice: rangeMin > MIN_PRICE ? String(rangeMin) : null, maxPrice: rangeMax < MAX_PRICE ? String(rangeMax) : null })}
          disabled={isPending}
          className="w-full h-8 text-xs font-semibold bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors cursor-pointer disabled:opacity-60"
        >
          Apply Price
        </button>
      </div>

      {/* Rating Filter */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--border-color)]">
        <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400" /> Customer Rating
        </label>
        <div className="space-y-1.5">
          {/* "All Ratings" option */}
          <button
            type="button"
            onClick={() => updateParams({ minRating: null })}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
              activeMinRating === 0
                ? "bg-primary/10 border border-primary/30 text-primary"
                : "border border-[var(--border-color)] text-[var(--foreground-muted)] hover:border-primary/50 hover:text-primary"
            }`}
          >
            <span>All Ratings</span>
          </button>
          {RATING_OPTIONS.map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => updateParams({ minRating: activeMinRating === rating ? null : String(rating) })}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                activeMinRating === rating
                  ? "bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                  : "border border-[var(--border-color)] text-[var(--foreground-muted)] hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < rating ? "fill-amber-400 text-amber-400" : "text-[var(--foreground-muted)] dark:text-[var(--foreground-secondary)]"}`}
                  />
                ))}
                <span className="ml-0.5">& up</span>
              </div>
              {activeMinRating === rating && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Badge Filter */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--border-color)]">
        <label className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-primary" /> Badges
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BADGE_OPTIONS.map((badge) => {
            const isActive = activeBadge.toLowerCase() === badge.id.toLowerCase();
            const badgeColors: Record<string, string> = {
              new: isActive
                ? "bg-emerald-500 text-white shadow-xs border-emerald-500"
                : "border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
              hot: isActive
                ? "bg-red-500 text-white shadow-xs border-red-500"
                : "border-red-200 dark:border-red-800/80 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40",
              popular: isActive
                ? "bg-amber-500 text-white shadow-xs border-amber-500"
                : "border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40",
              trending: isActive
                ? "bg-purple-600 text-white shadow-xs border-purple-600"
                : "border-purple-200 dark:border-purple-800/80 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40",
              "top-seller": isActive
                ? "bg-primary text-white shadow-xs border-primary"
                : "border-primary/30 text-primary hover:bg-primary/10",
              "value-of-the-day": isActive
                ? "bg-orange-500 text-white shadow-xs border-orange-500"
                : "border-orange-200 dark:border-orange-800/80 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40",
            };
            return (
              <button
                key={badge.id}
                type="button"
                onClick={() => updateParams({ badge: isActive ? null : badge.id })}
                className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer border ${badgeColors[badge.id] || (isActive ? "bg-primary text-white" : "border-[var(--border-color)] text-[var(--foreground-muted)]")}`}
              >
                {badge.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured, In Stock & On Sale */}
      <div className="space-y-3 pt-2 border-t border-[var(--border-color)]">
        {/* Featured */}
        <div className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
          <RadioGroup
            value={activeFeatured ? "yes" : "no"}
            onChange={(val) => updateParams({ isFeatured: val === "yes" ? "true" : null })}
            aria-label="Featured filter"
          >
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-[var(--foreground)]">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Featured
            </div>
            <div className="flex gap-4">
              <Radio value="no">
                <Radio.Content className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)] cursor-pointer">
                  <Radio.Control className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)] flex items-center justify-center data-selected:border-primary data-selected:bg-primary">
                    <Radio.Indicator className="w-1.5 h-1.5 rounded-full bg-[var(--surface-elevated)]" />
                  </Radio.Control>
                  All
                </Radio.Content>
              </Radio>
              <Radio value="yes">
                <Radio.Content className="flex items-center gap-1.5 text-[11px] text-[var(--foreground-muted)] cursor-pointer">
                  <Radio.Control className="w-3.5 h-3.5 rounded-full border border-[var(--border-color)] flex items-center justify-center data-selected:border-primary data-selected:bg-primary">
                    <Radio.Indicator className="w-1.5 h-1.5 rounded-full bg-[var(--surface-elevated)]" />
                  </Radio.Control>
                  Featured only
                </Radio.Content>
              </Radio>
            </div>
          </RadioGroup>
        </div>

        {/* In Stock */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-xs font-semibold text-[var(--foreground)] block">In Stock Only</span>
              <span className="text-[10px] text-[var(--foreground-muted)]">Available items</span>
            </div>
          </div>
          <Switch isSelected={activeInStock} onChange={(checked) => updateParams({ inStock: checked ? "true" : null })} size="sm">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>

        {/* On Sale / Has Active Offer */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--surface-alt)]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <div>
              <span className="text-xs font-semibold text-[var(--foreground)] block">On Sale</span>
              <span className="text-[10px] text-[var(--foreground-muted)]">Active deals only</span>
            </div>
          </div>
          <Switch isSelected={activeHasOffer} onChange={(checked) => updateParams({ hasOffer: checked ? "true" : null })} size="sm">
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Content>
          </Switch>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Responsive Expandable / Collapsible Section (< lg screens) */}
      <div className="lg:hidden w-full mb-4">
        <button
          type="button"
          onClick={() => setIsExpandedResponsive(!isExpandedResponsive)}
          className="w-full flex items-center justify-between px-4 h-11 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-elevated)] text-xs font-semibold text-[var(--foreground)] hover:border-primary cursor-pointer shadow-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <span>Filters {hasActiveFilters && "(Active)"}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-[var(--foreground-muted)] transition-transform duration-200 ${
              isExpandedResponsive ? "rotate-180 text-primary" : ""
            }`}
          />
        </button>

        {/* Collapsible Content */}
        {isExpandedResponsive && (
          <div className="mt-2.5 p-5 bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-color)] shadow-xs animate-in fade-in-50 slide-in-from-top-2 duration-200">
            {filterContent}
          </div>
        )}
      </div>

      {/* Desktop Sticky Sidebar (>= lg screens) */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-24 max-h-[calc(100dvh-120px)] overflow-y-auto">
        <div className="bg-[var(--surface-elevated)] rounded-2xl border border-[var(--border-color)] shadow-xs p-5">
          {filterContent}
        </div>
      </aside>
    </>
  );
}
