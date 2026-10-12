import { getUserSession } from "@/lib/core/session";
import { redirect } from "next/navigation";

export default async function DashboardSettingsRedirectPage() {
  const user = await getUserSession();
  const role = ((user as { role?: string })?.role || "customer").toLowerCase();

  if (role === "admin" || role === "demoadmin") {
    redirect("/dashboard/admin/settings");
  } else {
    redirect("/dashboard/customer/settings");
  }
}
