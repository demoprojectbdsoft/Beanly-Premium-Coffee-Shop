import { getRequiredShopper } from "@/lib/core/session";

/**
 * The buyer workspace. A customer reaches it directly, and an approved vendor
 * keeps reaching it too: becoming a seller changes the role, not the account,
 * so the cart, wishlist and orders built up as a customer stay open here
 * alongside the seller pages. Staff and riders, who never buy, are refused.
 */
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await getRequiredShopper();
  return <>
    {children}
  </>;
}
