import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getCategories } from "@/lib/api/categories";
import { getSubCategories } from "@/lib/api/subCategories";
import type { Category, SubCategory } from "@/types";
import AddProductClient from "@/app/(dashboard)/dashboard/admin/products/add/AddProductClient";

export const dynamic = "force-dynamic";

/**
 * "Add product" for a vendor.
 *
 * This is the admin form itself, not a copy: the same fields, the same uploads
 * and the same checks, with `mode="vendor"` so the row is saved as this
 * seller's listing and the board it returns to is the vendor's own.
 *
 * The categories come from the same read the shop uses, so a vendor can only
 * file a product under a category shoppers can already browse.
 */
export default async function NewVendorProductPage() {
  await getRequiredRole("vendor");

  const [categoriesRes, subCategoriesRes] = await Promise.all([
    getCategories(),
    getSubCategories(),
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

  return (
    <AddProductClient
      mode="vendor"
      categories={categories.filter((category) => category.isActive !== false)}
      subcategories={subCategories}
    />
  );
}
