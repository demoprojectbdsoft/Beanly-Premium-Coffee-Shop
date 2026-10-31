import React from "react";
import { notFound } from "next/navigation";
import { getRequiredRole } from "@/lib/core/session";
import { getVendorApplication } from "@/lib/api/vendor";
import type { VendorApplicationDetail } from "@/types/vendor";
import VendorReviewClient from "./VendorReviewClient";

export const dynamic = "force-dynamic";

/**
 * One application, in full.
 *
 * The read happens here rather than in the client so the decision screen cannot
 * be rendered from a stale payload: every visit asks the API for the current
 * file, including the history the previous decisions left behind.
 */
interface VendorReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function VendorReviewPage({ params }: VendorReviewPageProps) {
  await getRequiredRole("admin");

  const { id } = await params;
  const response = await getVendorApplication(id);
  const detail = (response?.data ?? null) as VendorApplicationDetail | null;

  if (!detail?.application) {
    notFound();
  }

  return <VendorReviewClient detail={detail} />;
}
