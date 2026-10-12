"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, RotateCcw } from "lucide-react";
import { Select, ListBox } from "@heroui/react";
import { ProductsTopBarProps } from "@/types";

const SORT_OPTIONS = [
  { id: "default",    label: "Default Sorting" },
  { id: "newest",     label: "Newest Arrivals" },
  { id: "price_asc",  label: "Price: Low to High" },
  { id: "price_desc", label: "Price: High to Low" },
  { id: "rating",     label: "Customer Rating" },
  { id: "featured",   label: "Featured" },
];

export default function ProductsTopBar({ categories = [], subCategories = [], totalResults }: ProductsTopBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch      = searchParams.get("search") || "";
  const currentCategory    = searchParams.get("category") || "";
  const currentSubCategory = searchParams.get("subCategory") || "all";
  const currentSort        = searchParams.get("sort") || "default";

  // Detect any active filter across both TopBar and SidebarFilter
  const hasAnyFilter = Boolean(
    currentSearch ||
    currentCategory ||
    (currentSubCategory && currentSubCategory !== "all") ||
    (currentSort && currentSort !== "default") ||
    searchParams.get("minPrice") ||
    searchParams.get("maxPrice") ||
    searchParams.get("discount") ||
    searchParams.get("badge") ||
    searchParams.get("isFeatured") ||
    searchParams.get("inStock") ||
    searchParams.get("minRating") ||
    searchParams.get("hasOffer")
  );

  // Find the active category object to filter subcategories
  const activeCategoryObj = categories.find(
    (c) => c.slug === currentCategory
  );

  // Filter subcategories that belong to the active category
  const filteredSubCategories = activeCategoryObj
    ? subCategories.filter((sc) => {
        const catId = activeCategoryObj._id || (activeCategoryObj as any).id;
        const p = sc.categoryId;
        const pId = typeof p === "object" && p !== null ? (p as any)._id || (p as any).id : p;
        return catId && pId && String(pId) === String(catId);
      })
    : [];

  const [localSearch, setLocalSearch] = useState(currentSearch);

  useEffect(() => { setLocalSearch(currentSearch); }, [currentSearch]);

  // Debounce search input
  useEffect(() => {
    if (localSearch === currentSearch) return;
    const timer = setTimeout(() => {
      updateParams({ search: localSearch || null, page: null });
    }, 400);
    return () => clearTimeout(timer);
  }, [localSearch]);

  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (!v || v === "all" || v === "default") params.delete(k);
      else params.set(k, v);
    });
    startTransition(() => router.push(`/shop?${params.toString()}`, { scroll: false }));
  };

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-sky-100/80 dark:border-gray-800 shadow-xs p-3 sm:p-4 mb-4 sm:mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">

        {/* Search Input */}
        <div className="flex-1 flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full h-10 sm:h-11 pl-9 sm:pl-10 pr-9 sm:pr-10 text-xs sm:text-sm rounded-xl border border-sky-100/80 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/60 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 transition-all"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => { setLocalSearch(""); updateParams({ search: null, page: null }); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Results count + Clear All button */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-xl bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 text-xs text-sky-700 dark:text-sky-300 whitespace-nowrap">
              <span className="font-bold mr-1">{totalResults}</span> products
              {isPending && <span className="ml-1.5 animate-pulse text-gray-400">…</span>}
            </div>

            {hasAnyFilter && (
              <button
                type="button"
                onClick={() => { setLocalSearch(""); startTransition(() => router.push("/shop", { scroll: false })); }}
                className="flex items-center gap-1.5 h-10 sm:h-11 px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white hover:border-red-500 dark:hover:bg-red-500 dark:hover:border-red-500 dark:hover:text-white transition-all cursor-pointer whitespace-nowrap group"
              >
                <RotateCcw className="w-3.5 h-3.5 group-hover:-rotate-180 transition-transform duration-500" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Category, Subcategory & Sort Selects in Single Row */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Category Dropdown — always visible */}
          <div className="flex-1 sm:flex-initial min-w-[130px] sm:min-w-[165px]">
            <Select
              aria-label="Filter by Category"
              selectedKey={currentCategory || "all"}
              onSelectionChange={(key) => updateParams({ category: String(key || ""), subCategory: null, page: null })}
            >
              <Select.Trigger className="h-10 sm:h-11 w-full px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-sky-100/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                <Select.Value className="text-xs font-semibold truncate" />
                <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
              </Select.Trigger>
              <Select.Popover className="w-56 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                <ListBox>
                  <ListBox.Item id="all" textValue="All Categories" className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between">
                    All Categories
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {categories.map((cat) => (
                    <ListBox.Item
                      key={cat.slug}
                      id={cat.slug}
                      textValue={cat.name}
                      className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
                    >
                      {cat.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          {/* Subcategory Dropdown — only shown when selected category has subcategories */}
          {filteredSubCategories.length > 0 && (
          <div className="flex-1 sm:flex-initial min-w-[130px] sm:min-w-[165px]">
            <Select
              aria-label="Filter by Subcategory"
              selectedKey={currentSubCategory}
              onSelectionChange={(key) => updateParams({ subCategory: String(key || ""), page: null })}
            >
              <Select.Trigger className="h-10 sm:h-11 w-full px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-sky-100/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                <Select.Value className="text-xs font-semibold truncate" />
                <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
              </Select.Trigger>
              <Select.Popover className="w-56 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
                <ListBox>
                  <ListBox.Item id="all" textValue="All Subcategories" className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between">
                    All Subcategories
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                  {filteredSubCategories.map((sub) => (
                    <ListBox.Item
                      key={sub.slug}
                      id={sub.slug}
                      textValue={sub.name}
                      className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between"
                    >
                      {sub.name}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
          )}

          {/* Sort Dropdown */}
          <div className="flex-1 sm:flex-initial min-w-[130px] sm:min-w-[155px]">
            <Select
              aria-label="Sort Products"
              selectedKey={currentSort}
              onSelectionChange={(key) => updateParams({ sort: String(key || ""), page: null })}
            >
              <Select.Trigger className="h-10 sm:h-11 w-full px-3 sm:px-4 rounded-xl sm:rounded-2xl border border-sky-100/80 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-between gap-1.5 cursor-pointer hover:border-sky-400 transition-colors shadow-xs [&>span]:text-xs [&>span]:font-semibold">
                <Select.Value className="text-xs font-semibold truncate" />
                <Select.Indicator className="[&>svg]:w-3.5 [&>svg]:h-3.5 text-gray-400 shrink-0" />
              </Select.Trigger>
              <Select.Popover className="w-52 p-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50">
                <ListBox>
                  {SORT_OPTIONS.map((opt) => (
                    <ListBox.Item key={opt.id} id={opt.id} textValue={opt.label} className="text-xs font-medium px-3 py-2 rounded-lg hover:bg-sky-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-between">
                      {opt.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
