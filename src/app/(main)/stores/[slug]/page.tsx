import { redirect } from "next/navigation";

interface StoreRedirectProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * One shop's old storefront address, kept as a signpost.
 *
 * The page itself lives at `/vendors/<slug>` now. Everything a reader could
 * have had in the URL — the shelf search, the sort and the page number —
 * travels with them, so a shared link lands on the same shelf it named.
 */
export default async function StoreRedirect({ params, searchParams }: StoreRedirectProps) {
  const { slug } = await params;
  const query = await searchParams;
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "string" && value) search.set(key, value);
    else if (Array.isArray(value) && value[0]) search.set(key, value[0]);
  }

  const suffix = search.toString();
  redirect(`/vendors/${encodeURIComponent(slug)}${suffix ? `?${suffix}` : ""}`);
}
