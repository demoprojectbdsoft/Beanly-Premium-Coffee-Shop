import type { Metadata } from "next";
import ContentPage from "@/components/shared/ContentPage";
import { CONTENT_PAGES } from "@/lib/contentPages";

/** The support desk, reachable from the footer and every closing band. */
export const metadata: Metadata = {
  title: "Customer service",
  description:
    "Phone, email and dashboard support for orders, payments, deliveries and accounts.",
};

export default function CustomerServicePage() {
  return <ContentPage doc={CONTENT_PAGES["customer-service"]} />;
}
