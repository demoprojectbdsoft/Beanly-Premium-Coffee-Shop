import React from "react";
import { getProducts } from "@/lib/api/products";
import { getCategories } from "@/lib/api/categories";
import { getSubCategories } from "@/lib/api/subCategories";
import ProductsClient from "./ProductsClient";

export const dynamic = "force-dynamic";

interface AdminProductsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function AdminProductsPage({
  searchParams,
}: AdminProductsPageProps) {
  const params = await searchParams;
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  const [productsRes, categoriesRes, subCategoriesRes] = await Promise.all([
    // The desk reads the admin shape: cost, margin and every row it governs.
    getProducts({ ...params, page, limit }, { admin: true }),
    getCategories(),
    getSubCategories(),
  ]);

  const products = Array.isArray(productsRes?.data?.products)
    ? productsRes.data.products
    : Array.isArray(productsRes?.products)
    ? productsRes.products
    : Array.isArray(productsRes?.data)
    ? productsRes.data
    : Array.isArray(productsRes)
    ? productsRes
    : [];

  const pagination = productsRes?.data?.pagination ?? {
    page,
    limit,
    total: productsRes?.data?.total ?? products.length,
    totalPages: Math.max(1, Math.ceil((productsRes?.data?.total ?? products.length) / limit)),
  };

  const categories = Array.isArray(categoriesRes?.data)
    ? categoriesRes.data
    : Array.isArray(categoriesRes)
    ? categoriesRes
    : [];

  const subcategories = Array.isArray(subCategoriesRes?.data)
    ? subCategoriesRes.data
    : Array.isArray(subCategoriesRes)
    ? subCategoriesRes
    : [];

  return (
    <ProductsClient
      initialProducts={products}
      pagination={pagination}
      categories={categories}
      subcategories={subcategories}
    />
  );
}
