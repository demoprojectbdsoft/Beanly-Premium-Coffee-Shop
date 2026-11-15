import type { Metadata } from "next";
import ContentPage from "@/components/shared/ContentPage";
import { CONTENT_PAGES } from "@/lib/contentPages";

/** Manuals, warranty cover and the repair route, after the sale. */
export const metadata: Metadata = {
  title: "Product support",
  description:
    "Manuals, warranty cover, troubleshooting and repair or replacement for products bought here.",
};

export default function ProductSupportPage() {
  return <ContentPage doc={CONTENT_PAGES.support} />;
}
