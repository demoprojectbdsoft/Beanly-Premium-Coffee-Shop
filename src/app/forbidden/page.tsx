import { Metadata } from "next";
import ForbiddenView from "@/components/shared/ForbiddenView";

export const metadata: Metadata = {
  title: "403 Forbidden - Access Denied | Electro",
  description:
    "You do not have permission to view or access this resource on Electro.",
};

export default function ForbiddenPage() {
  return <ForbiddenView />;
}
