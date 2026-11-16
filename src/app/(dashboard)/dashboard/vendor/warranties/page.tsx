import React from "react";
import { getRequiredRole } from "@/lib/core/session";
import { getVendorWarranties } from "@/lib/api/warranty";
import { buildWarrantyQuery, readWarrantyPage, type WarrantySearchParams } from "@/lib/warrantyQuery";
import AdminWarrantiesClient from "@/app/(dashboard)/dashboard/admin/warranties/AdminWarrantiesClient";

export const dynamic = "force-dynamic";

interface VendorWarrantiesPageProps {
  searchParams: Promise<WarrantySearchParams>;
}

/**
 * Warranty claims for a seller.
 *
 * This is the store team's board itself, not a copy: the same filters, the same
 * claim timeline and the same resolve/reject/extend actions. Only the read
 * changes — `/warranties/vendor` is scoped to this seller's own products — and
 * the API refuses any claim on another shop's listing.
 */
export default async function VendorWarrantiesPage({ searchParams }: VendorWarrantiesPageProps) {
  await getRequiredRole("vendor");

  const params = await searchParams;
  const { page, limit, query } = buildWarrantyQuery(params);

  const empty = readWarrantyPage(null, page, limit);
  let { warranties, pagination } = empty;

  try {
    const res = await getVendorWarranties(query);
    ({ warranties, pagination } = readWarrantyPage(res, page, limit));
  } catch (err) {
    console.error("Failed to fetch vendor warranties:", err);
  }

  return (
    <AdminWarrantiesClient
      initialWarranties={warranties}
      pagination={pagination}
    />
  );
}
