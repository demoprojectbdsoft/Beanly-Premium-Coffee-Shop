import type { Metadata } from "next";
import ContentPage from "@/components/shared/ContentPage";
import { CONTENT_PAGES } from "@/lib/contentPages";

/** The thirty-day policy, with the window, the steps and the refund timing. */
export const metadata: Metadata = {
  title: "Returns and exchanges",
  description:
    "How to send an item back within thirty days, what can be returned, and when a refund lands.",
};

export default function ReturnsPage() {
  return <ContentPage doc={CONTENT_PAGES.returns} />;
}
