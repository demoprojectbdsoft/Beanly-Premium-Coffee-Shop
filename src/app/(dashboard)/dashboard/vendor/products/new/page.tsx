import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getCategories } from "@/lib/api/categories";
import { getSubCategories } from "@/lib/api/subCategories";
import { asProductList, getMyProducts } from "@/lib/api/vendorProducts";
import type { Category, SubCategory } from "@/types";
import type { VendorProductPlan } from "@/types/vendor";
import VendorProductForm from "../VendorProductForm";

export const dynamic = "force-dynamic";

/**
 * "Add product".
 *
 * The categories come from the same read the shop uses, so a vendor can only
 * file a product under a category shoppers can already browse. The plan summary
 * is read here rather than passed down from the list, because this page can be
 * opened directly.
 */
export default async function NewVendorProductPage() {
  await getRequiredRole("vendor");

  const [categoriesRes, subCategoriesRes, listRes] = await Promise.all([
    getCategories(),
    getSubCategories(),
    getMyProducts({ limit: 1 }),
  ]);

  const categories: Category[] = Array.isArray(categoriesRes?.data)
    ? categoriesRes.data
    : Array.isArray(categoriesRes)
      ? categoriesRes
      : [];

  const subCategories: SubCategory[] = Array.isArray(subCategoriesRes?.data)
    ? subCategoriesRes.data
    : Array.isArray(subCategoriesRes)
      ? subCategoriesRes
      : [];

  const plan: VendorProductPlan = asProductList(listRes)?.plan ?? {
    id: "free",
    name: "Free",
    maxProducts: 10,
    used: 0,
    isLive: false,
    effectiveUntil: null,
  };

  return (
    <VendorProductForm
      mode="create"
      categories={categories.filter((category) => category.isActive !== false)}
      subCategories={subCategories}
      plan={plan}
    />
  );
}
