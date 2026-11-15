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
  const page = Math.max(1, Math.floor(Number(params?.page)) || 1);
  const limit = Math.max(1, Math.floor(Number(params?.limit)) || 10);

  // The desk reads the admin shape: cost, margin and every row it governs.
  const readCatalog = async (targetPage: number) => {
    const res = await getProducts({ ...params, page: targetPage, limit }, { admin: true });
    const list = Array.isArray(res?.data?.products)
      ? res.data.products
      : Array.isArray(res?.products)
      ? res.products
      : Array.isArray(res?.data)
      ? res.data
      : [];
    const total = Number(res?.data?.pagination?.total ?? res?.data?.total ?? list.length) || 0;
    return {
      list,
      pagination: {
        page: targetPage,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  };

  const [first, categoriesRes, subCategoriesRes] = await Promise.all([
    readCatalog(page),
    getCategories(),
    getSubCategories(),
  ]);

  // A filter that shrank the list while the reader was further down leaves the
  // requested page past the end of it. Read the last page that exists instead of
  // showing an empty table and a footer that counts backwards — the same list a
  // stale link in another tab asks for.
  let { list: products, pagination } = first;
  if (page > pagination.totalPages) {
    ({ list: products, pagination } = await readCatalog(pagination.totalPages));
  }

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
