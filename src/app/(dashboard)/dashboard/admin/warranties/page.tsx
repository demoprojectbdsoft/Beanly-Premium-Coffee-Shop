import React from "react";
import { getWarranties } from "@/lib/api/warranty";
import { buildWarrantyQuery, readWarrantyPage, type WarrantySearchParams } from "@/lib/warrantyQuery";
import AdminWarrantiesClient from "./AdminWarrantiesClient";

export const dynamic = "force-dynamic";

interface AdminWarrantiesPageProps {
  searchParams: Promise<WarrantySearchParams>;
}

export default async function AdminWarrantiesPage({ searchParams }: AdminWarrantiesPageProps) {
  const params = await searchParams;
  const { page, limit, query } = buildWarrantyQuery(params);

  const empty = readWarrantyPage(null, page, limit);
  let { warranties, pagination } = empty;

  try {
    const res = await getWarranties(query);
    ({ warranties, pagination } = readWarrantyPage(res, page, limit));
  } catch (err) {
    console.error("Failed to fetch admin warranties:", err);
  }

  return (
    <AdminWarrantiesClient
      initialWarranties={warranties}
      pagination={pagination}
    />
  );
}
