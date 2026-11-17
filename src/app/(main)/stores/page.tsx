import { redirect } from "next/navigation";

interface StoresRedirectProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The old shop directory, kept as a signpost.
 *
 * The marketplace's vendors live at `/vendors` now, and every link inside the
 * app points there. A bookmarked or shared `/stores?category=…` link is still
 * worth honouring, so the filters are carried across rather than dropped.
 */
export default async function StoresRedirect({ searchParams }: StoresRedirectProps) {
  const params = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value) query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }

  const suffix = query.toString();
  redirect(`/vendors${suffix ? `?${suffix}` : ""}`);
}
