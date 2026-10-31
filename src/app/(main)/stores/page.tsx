import { asStoreList, getPublicStores } from "@/lib/api/stores";
import StoresClient from "./StoresClient";

export const dynamic = "force-dynamic";

// The sorts the API answers for, in the order the page offers them.
const SORT_CHOICES = ["featured", "rating", "newest", "popular"];

interface StoresPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    featured?: string;
    sort?: string;
    page?: string;
  }>;
}

/**
 * Shop discovery.
 *
 * Everything the page shows is decided by the URL, so a filtered view is a
 * link a shopper can share — and the same reads answer it on a direct hit.
 */
export default async function StoresPage({ searchParams }: StoresPageProps) {
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
    <StoresClient
      stores={result?.stores ?? []}
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
