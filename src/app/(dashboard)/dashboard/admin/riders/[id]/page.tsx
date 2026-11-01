import React from "react";
import { notFound } from "next/navigation";
import { getRequiredRole } from "@/lib/core/session";
import { getRiderApplication } from "@/lib/api/rider";
import type { RiderApplicationDetail } from "@/types/rider";
import RiderReviewClient from "./RiderReviewClient";

export const dynamic = "force-dynamic";

/**
 * One rider application, in full.
 *
 * The read happens here rather than in the client so the decision screen cannot
 * be rendered from a stale payload: every visit asks the API for the current
 * file, including the history the previous decisions left behind.
 */
interface RiderReviewPageProps {
  params: Promise<{ id: string }>;
}

export default async function RiderReviewPage({ params }: RiderReviewPageProps) {
  await getRequiredRole("admin");

  const { id } = await params;
  const response = await getRiderApplication(id);
  const detail = (response?.data ?? null) as RiderApplicationDetail | null;

  if (!detail?.application) {
    notFound();
  }

  return <RiderReviewClient detail={detail} />;
}
