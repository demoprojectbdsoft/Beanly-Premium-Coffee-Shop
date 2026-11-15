import React from "react";
import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/api/products";
import ProductDetailClient from "./ProductDetailClient";

export const dynamic = "force-dynamic";

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AdminProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  // The admin shape also reads a seller's draft or hidden row.
  const productRes = await getProductBySlug(slug, { admin: true });

  const product = productRes?.data || productRes;

  if (!product || !product.title) {
    notFound();
  }

  return <ProductDetailClient product={product} />;
}
