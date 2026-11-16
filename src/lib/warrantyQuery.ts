import type { RawWarranty, NormalizedAdminWarranty } from "@/types";

/**
 * The two page reads behind the warranty board.
 *
 * The admin list and the vendor list ask the same questions and render the same
 * table, so the row shape and the query string live here once. Only the endpoint
 * differs: the store team reads every warranty, a seller reads their own.
 */

/** The filters the board understands, straight off the URL. */
export interface WarrantySearchParams {
  search?: string;
  status?: string;
  warrantyType?: string;
  sort?: string;
  page?: string;
  limit?: string;
  // Set by a notification link, so it opens on the order that was delivered.
  orderId?: string;
}

export function buildWarrantyQuery(params: WarrantySearchParams | undefined) {
  const page = Number(params?.page) || 1;
  const limit = Number(params?.limit) || 10;

  // No status in the URL means the default view: only what customers claimed.
  // "all" is the explicit way to ask for every warranty, so it drops the filter.
  const status = params?.status;
  const query: Record<string, string | number | undefined> = {
    page,
    limit,
    search: params?.search,
    status: status === "all" ? undefined : status || "claimed",
    // "all" warranty types is the same as no warranty-type filter at all.
    warrantyType: params?.warrantyType === "all" ? undefined : params?.warrantyType,
    sort: params?.sort,
    // A notification link narrows the list to the one order it is about.
    orderId: params?.orderId,
  };

  return { page, limit, query };
}

export function normalizeWarranty(w: RawWarranty): NormalizedAdminWarranty {
  return {
    id: w.id || w._id,
    userId: w?.userId?._id || w?.userId?.id || "",
    userName: w?.userId?.name,
    userEmail: w?.userId?.email,
    productId: w?.productId?._id || w?.productId?.id || "",
    productTitle: w?.productId?.title,
    productSlug: w?.productId?.slug,
    productImage: w?.productId?.image,
    orderId: w?.orderId?._id || w?.orderId?.id || "",
    orderNumber: w?.orderId?.orderNumber,
    activationDate: w.activationDate,
    expiryDate: w.expiryDate,
    status: w.status as NormalizedAdminWarranty["status"],
    // The type saved on the record wins, because that is the cover the order was
    // actually sold with: the server filters and extends by this same field, and
    // only an extended-warranty record may take extra months. The live product is
    // only a fallback for older records that never stored a copy.
    warrantyType: w.warrantyType || w?.productId?.warrantyType,
    warrantyPeriodMonths:
      w?.productId?.warrantyPeriodMonths ?? w.warrantyPeriodMonths,
    warrantyTerms: w?.productId?.warrantyTerms || w.warrantyTerms,
    // Why a closed record is closed, and every extension already granted.
    closedReason: w.closedReason,
    extensions: Array.isArray(w.extensions) ? w.extensions : [],
    maxExtensions: w.maxExtensions,
    extensionsLeft: w.extensionsLeft,
    claimProblem: w.claimProblem,
    claimReason: w.claimReason,
    claimDescription: w.claimDescription,
    claimImages: w.claimImages,
    claimAdminNote: w.claimAdminNote,
    resolutionDetails: w.resolutionDetails,
    createdAt: w.createdAt,
  };
}

/** Turns one API page into the rows and pagination the board renders. */
export function readWarrantyPage(
  res: unknown,
  page: number,
  limit: number
): {
  warranties: NormalizedAdminWarranty[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
} {
  // The list arrives either wrapped in `data.warranties` or as the bare array,
  // depending on which read answered, so both shapes are accepted here.
  const data = (res as { data?: WarrantyPayload | RawWarranty[] } | null | undefined)?.data;
  const raw: RawWarranty[] = Array.isArray(data) ? data : data?.warranties ?? [];
  const warranties = raw.map(normalizeWarranty);
  const total = Array.isArray(data) ? warranties.length : data?.total ?? warranties.length;

  return {
    warranties,
    pagination:
      (!Array.isArray(data) ? data?.pagination : undefined) ?? {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
  };
}

interface WarrantyPayload {
  warranties?: RawWarranty[];
  total?: number;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}
