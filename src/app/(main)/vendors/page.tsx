import type { Metadata } from "next";
import { asStoreList, getPublicStores } from "@/lib/api/stores";
import VendorsClient from "./VendorsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendors",
  description:
    "Every independent seller trading on Sparq right now — ratings, delivery success and their full shelves in one place.",
};

/** The sorts the API answers for, in the order the page offers them. */
const SORT_CHOICES = ["featured", "latest", "rating", "newest", "popular"];

interface VendorsPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    featured?: string;
    sort?: string;
    page?: string;
  }>;
}

/**
 * The vendor directory.
 *
 * Everything the page shows is decided by the URL, so a filtered view is a link
 * a shopper can share — and the same read answers it on a direct hit. Only
 * trading shops are ever here: the API filters a hidden, suspended or closed
 * shop out before the page sees it.
 */
export default async function VendorsPage({ searchParams }: VendorsPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const sort = SORT_CHOICES.includes(params.sort || "") ? params.sort! : "featured";

  const result = asStoreList(
    await getPublicStores({
      search: params.search,
      category: params.category,
      featured: params.featured === "true" ? true : undefined,
      sort,
      page,
      limit: 12,
    })
  );

  return (
    <VendorsClient
      vendors={result?.stores ?? []}
      pagination={result?.pagination ?? { page, limit: 12, total: 0, totalPages: 1 }}
      filters={{
        search: params.search || "",
        category: params.category || "",
        featured: params.featured === "true",
        sort,
      }}
    />
  );
}
