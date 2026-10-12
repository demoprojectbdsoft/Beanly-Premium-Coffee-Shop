"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, Sparkles, CheckCircle2, Sliders, ChevronDown, DollarSign, Percent, Star, Tag, Zap } from "lucide-react";
import { RadioGroup, Radio, Switch } from "@heroui/react";
import { ProductsSidebarFilterProps } from "@/types";

const DISCOUNT_TABS = ["0-20", "20-40", "40-60", "60-80", "80-100"] as const;
const BADGE_OPTIONS = ["new", "hot", "sale", "discount"] as const;
const RATING_OPTIONS = [4, 3, 2, 1] as const;

const MIN_PRICE = 0;
const MAX_PRICE = 2000;

export default function ProductsSidebarFilter({}: ProductsSidebarFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      <div className="flex items-center gap-2 pb-3 border-b border-sky-100/80 dark:border-gray-800">
        <Filter className="w-4 h-4 text-sky-600 dark:text-sky-400" />
        <h2 className="text-xs font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Filters</h2>
        {hasActiveFilters && (
          <span className="ml-auto text-[10px] font-bold bg-sky-500 text-white rounded-full px-2 py-0.5 leading-none">
            Active
          </span>
        )}
      </div>

      {/* Discount Range */}
      <div className="space-y-2.5 pt-2 border-t border-sky-100/80 dark:border-gray-800">
        <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
          <Percent className="w-3.5 h-3.5 text-sky-500" /> Discount
        </label>
        <div className="flex flex-wrap gap-1.5">
          {DISCOUNT_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => updateParams({ discount: activeDiscount === tab ? null : tab })}
              className={`text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer ${
                activeDiscount === tab
                  ? "bg-sky-500 text-white shadow-xs"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-sky-400"
              }`}
            >
              {tab}%
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Slider */}
      <div className="space-y-3 pt-2 border-t border-sky-100/80 dark:border-gray-800">
        <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-sky-500" /> Price Range
        </label>
        <div className="flex items-center justify-between text-xs font-semibold text-sky-600 dark:text-sky-400">
          <span>${rangeMin}</span>
          <span className="text-[10px] text-gray-400">—</span>
          <span>${rangeMax}</span>
        </div>
        <div className="relative h-5 flex items-center">
          <div className="absolute w-full h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="absolute h-1.5 rounded-full bg-sky-500" style={{ left: `${fillLeft}%`, right: `${100 - fillRight}%` }} />
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
          className="w-full h-8 text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:hover:bg-white dark:text-gray-900 rounded-lg transition-colors cursor-pointer disabled:opacity-60"
        >
          Apply Price
        </button>
      </div>

      {/* Rating Filter */}
      <div className="space-y-2.5 pt-2 border-t border-sky-100/80 dark:border-gray-800">
        <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5 text-amber-400" /> Customer Rating
        </label>
        <div className="space-y-1.5">
          {/* "All Ratings" option */}
          <button
            type="button"
            onClick={() => updateParams({ minRating: null })}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
              activeMinRating === 0
                ? "bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300"
                : "border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-sky-300 hover:text-sky-600"
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
                  : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-amber-300 hover:text-amber-600"
              }`}
            >
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < rating ? "fill-amber-400 text-amber-400" : "text-gray-300 dark:text-gray-600"}`}
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
      <div className="space-y-2.5 pt-2 border-t border-sky-100/80 dark:border-gray-800">
        <label className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-sky-500" /> Badge
        </label>
        <div className="flex flex-wrap gap-1.5">
          {BADGE_OPTIONS.map((badge) => {
            const isActive = activeBadge === badge;
            const badgeColors: Record<string, string> = {
              new:      isActive ? "bg-emerald-500 text-white" : "border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50",
              hot:      isActive ? "bg-red-500 text-white"     : "border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50",
              sale:     isActive ? "bg-orange-500 text-white"  : "border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-50",
              discount: isActive ? "bg-sky-500 text-white"     : "border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 hover:bg-sky-50",
            };
            return (
              <button
                key={badge}
                type="button"
                onClick={() => updateParams({ badge: isActive ? null : badge })}
                className={`text-xs font-semibold px-3 py-1 rounded-full transition-all cursor-pointer capitalize ${badgeColors[badge]}`}
              >
                {badge}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured, In Stock & On Sale */}
      <div className="space-y-3 pt-2 border-t border-sky-100/80 dark:border-gray-800">
        {/* Featured */}
        <div className="p-2.5 rounded-xl border border-sky-100/80 dark:border-gray-800 bg-sky-50/30 dark:bg-gray-800/40">
          <RadioGroup
            value={activeFeatured ? "yes" : "no"}
            onChange={(val) => updateParams({ isFeatured: val === "yes" ? "true" : null })}
            aria-label="Featured filter"
          >
            <div className="flex items-center gap-1.5 mb-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Featured
            </div>
            <div className="flex gap-4">
              <Radio value="no">
                <Radio.Content className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
                  <Radio.Control className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center data-selected:border-sky-500 data-selected:bg-sky-500">
                    <Radio.Indicator className="w-1.5 h-1.5 rounded-full bg-white" />
                  </Radio.Control>
                  All
                </Radio.Content>
              </Radio>
              <Radio value="yes">
                <Radio.Content className="flex items-center gap-1.5 text-[11px] text-gray-600 dark:text-gray-400 cursor-pointer">
                  <Radio.Control className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center data-selected:border-sky-500 data-selected:bg-sky-500">
                    <Radio.Indicator className="w-1.5 h-1.5 rounded-full bg-white" />
                  </Radio.Control>
                  Featured only
                </Radio.Content>
              </Radio>
            </div>
          </RadioGroup>
        </div>

        {/* In Stock */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-100/80 dark:border-gray-800 bg-sky-50/30 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">In Stock Only</span>
              <span className="text-[10px] text-gray-400">Available items</span>
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
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-sky-100/80 dark:border-gray-800 bg-sky-50/30 dark:bg-gray-800/40">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <div>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 block">On Sale</span>
              <span className="text-[10px] text-gray-400">Active deals only</span>
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
          className="w-full flex items-center justify-between px-4 h-11 rounded-2xl border border-sky-100/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:border-sky-400 cursor-pointer shadow-xs transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-500" />
            <span>Filters {hasActiveFilters && "(Active)"}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isExpandedResponsive ? "rotate-180 text-sky-500" : ""
            }`}
          />
        </button>

        {/* Collapsible Content */}
        {isExpandedResponsive && (
          <div className="mt-2.5 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-sky-100/80 dark:border-gray-800 shadow-xs animate-in fade-in-50 slide-in-from-top-2 duration-200">
            {filterContent}
          </div>
        )}
      </div>

      {/* Desktop Sticky Sidebar (>= lg screens) */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-sky-100/80 dark:border-gray-800 shadow-xs p-5">
          {filterContent}
        </div>
      </aside>
    </>
  );
}
