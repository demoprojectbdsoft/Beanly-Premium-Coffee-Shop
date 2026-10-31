import { getUserSession } from "@/lib/core/session";
import { redirect } from "next/navigation";

export default async function DashboardProfileRedirectPage() {
  const user = await getUserSession();
  const role = ((user as { role?: string })?.role || "customer").toLowerCase();

  if (role === "admin" || role === "demoadmin") {
    redirect("/dashboard/admin/profile");
  } else if (role === "rider") {
    redirect("/dashboard/rider/profile");
  } else if (role === "vendor") {
    redirect("/dashboard/vendor/profile");
  } else {
    redirect("/dashboard/customer/profile");
  }
}
