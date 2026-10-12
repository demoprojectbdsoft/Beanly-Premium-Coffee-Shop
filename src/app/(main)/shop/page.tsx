import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProducts } from "@/lib/api/products";
import { getCategories } from "@/lib/api/categories";
import { getSubCategories } from "@/lib/api/subCategories";
import ProductsTopBar from "@/components/shop/ProductsTopBar";
import ProductsSidebarFilter from "@/components/shop/ProductsSidebarFilter";
import ProductsGrid from "@/components/shop/ProductsGrid";
import { ShopQueryParams } from "@/types";

interface ShopPageProps {
  searchParams: Promise<ShopQueryParams>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;

  // Read URL search params
  const page = Number(params.page) || 1;

  // Fetch all data in parallel
  const [productsRes, categoriesRes, subCategoriesRes] = await Promise.all([
    getProducts({ ...params, page, limit: 12 }),
    getCategories(),
    getSubCategories(),
  ]);

  // The API always returns { success, message, data }
  const products = productsRes?.data?.products ?? [];
  const pagination = productsRes?.data?.pagination ?? {
    page,
    limit: 12,
    total: 0,
    totalPages: 1,
  };
  const categories = categoriesRes?.data ?? [];
  const subCategories = subCategoriesRes?.data ?? [];

  // Find the active category for breadcrumb (supports slug, name, or ID)
  const catParam = params.category || params.categoryId;
  const activeCategory = categories.find((c: any) => {
    if (!catParam) return false;
    const target = catParam.toLowerCase();
    return (
      c.slug?.toLowerCase() === target ||
      c.name?.toLowerCase() === target ||
      c._id === catParam ||
      c.id === catParam
    );
  });

  // Find the active subcategory for breadcrumb (supports slug, name, or ID)
  const subParam = params.subCategory || params.subCategoryId;
  const activeSubCategory = subCategories.find((s: any) => {
    if (!subParam) return false;
    const target = subParam.toLowerCase();
    return (
      s.slug?.toLowerCase() === target ||
      s.name?.toLowerCase() === target ||
      s._id === subParam ||
      s.id === subParam
    );
  });

  return (
    <div className="w-full py-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-6 flex-wrap">
        <Link href="/" className="hover:text-sky-600 dark:hover:text-sky-400 transition-colors">
          Home
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <Link
          href="/shop"
          className={`hover:text-sky-600 dark:hover:text-sky-400 transition-colors ${
            !activeCategory ? "font-semibold text-gray-800 dark:text-gray-200" : ""
          }`}
        >
          Shop
        </Link>
        {activeCategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <Link
              href={`/shop?category=${encodeURIComponent(activeCategory.slug || activeCategory.name)}`}
              className={`hover:text-sky-600 dark:hover:text-sky-400 transition-colors ${
                !activeSubCategory ? "font-semibold text-sky-600 dark:text-sky-400" : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {activeCategory.name}
            </Link>
          </>
        )}
        {activeSubCategory && (
          <>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-semibold text-sky-600 dark:text-sky-400">{activeSubCategory.name}</span>
          </>
        )}
      </nav>

      {/* Top bar: Search, Category filter & Sort */}
      <ProductsTopBar
        categories={categories}
        subCategories={subCategories}
        totalResults={pagination.total}
      />

      {/* Main layout: Sidebar filter (left) + Products grid (right) */}
      <div className="flex flex-col lg:flex-row items-start gap-6 xl:gap-8">
        <ProductsSidebarFilter
          subCategories={subCategories}
        />
        <ProductsGrid
          products={products}
          pagination={pagination}
        />
      </div>
    </div>
  );
}