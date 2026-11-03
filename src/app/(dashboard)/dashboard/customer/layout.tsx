import { getRequiredCustomer } from "@/lib/core/session";

/**
 * The buyer workspace. A customer reaches it directly, and an approved vendor
 * keeps reaching it too: becoming a seller changes the role, not the account,
 * so the cart, wishlist and orders built up as a customer stay open here
 * alongside the seller pages. Staff and riders, who never buy, are refused.
 *
 * The door only asks whether the account holds the buyer entry. Which
 * dashboard is on screen is the URL's job, so a guard that also demanded a
 * matching session hint would send someone standing in the right place to the
 * forbidden page. Buying itself is still checked where the money moves.
 */
export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await getRequiredCustomer();
  return <>
    {children}
  </>;
}
