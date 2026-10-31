import React from "react";
import { notFound } from "next/navigation";
import { getRequiredRole } from "@/lib/core/session";
import { getCategories } from "@/lib/api/categories";
import { getSubCategories } from "@/lib/api/subCategories";
import { asProduct, asProductList, getMyProduct, getMyProducts } from "@/lib/api/vendorProducts";
import type { Category, SubCategory } from "@/types";
import type { VendorProductPlan } from "@/types/vendor";
import VendorProductForm from "../VendorProductForm";

export const dynamic = "force-dynamic";

/**
 * Edit one of the vendor's own products.
 *
 * The read is scoped to the signed-in seller on the server, so an id belonging
 * to another store answers 404 exactly like an id that does not exist. That is
 * deliberate: a 403 would confirm the row is real.
 */
interface EditVendorProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditVendorProductPage({ params }: EditVendorProductPageProps) {
  await getRequiredRole("vendor");

  const { id } = await params;

  const [productRes, listRes, categoriesRes, subCategoriesRes] = await Promise.all([
    getMyProduct(id),
    getMyProducts({ limit: 1 }),
    getCategories(),
    getSubCategories(),
  ]);

  const product = asProduct(productRes);
  if (!product) notFound();

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
      mode="edit"
      product={product}
      categories={categories.filter((category) => category.isActive !== false)}
      subCategories={subCategories}
      plan={plan}
    />
  );
}
