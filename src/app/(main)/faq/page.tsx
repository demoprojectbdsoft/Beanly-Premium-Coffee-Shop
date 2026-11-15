import type { Metadata } from "next";
import ContentPage from "@/components/shared/ContentPage";
import { CONTENT_PAGES } from "@/lib/contentPages";

/**
 * The FAQ the footer has always linked to.
 *
 * The words live in `lib/contentPages`, not here: the same document is rendered
 * by other support screens and by any deployment of this storefront, and the
 * settings-filled tokens in it keep the copy true to whichever shop is running.
 */
export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Orders, payment, delivery, tracking, returns and account questions answered in full.",
};

export default function FaqPage() {
  return <ContentPage doc={CONTENT_PAGES.faq} />;
}
