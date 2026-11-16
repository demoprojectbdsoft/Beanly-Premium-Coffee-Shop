import React from "react";
import { notFound } from "next/navigation";
import { getRequiredRole } from "@/lib/core/session";
import { asProduct, getMyProduct } from "@/lib/api/vendorProducts";
import ProductDetailClient from "@/app/(dashboard)/dashboard/admin/products/[slug]/ProductDetailClient";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

/**
 * The read-only view of one of the vendor's own products.
 *
 * It is the admin detail page itself, opened in `vendor` mode: the breadcrumb
 * leads back to the vendor board and the URL only ever resolves a row the
 * token owns, so another seller's id answers 404 like a missing one.
 */
interface VendorProductViewPageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorProductViewPage({ params }: VendorProductViewPageProps) {
  await getRequiredRole("vendor");

  const { id } = await params;
  const product = asProduct(await getMyProduct(id));
  if (!product) notFound();

  // Both shapes come from the same API row; the detail page types the full
  // product, so the seller's row is handed to it as that shape.
  return <ProductDetailClient product={product as unknown as Product} mode="vendor" />;
}
