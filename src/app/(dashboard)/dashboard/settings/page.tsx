import { getUserSession } from "@/lib/core/session";
import { resolveActiveRole } from "@/lib/core/roles";
import { redirect } from "next/navigation";

export default async function DashboardSettingsRedirectPage() {
  const user = await getUserSession();
  // Every workspace owns its own settings screen, so the redirect follows the
  // active dashboard instead of the legacy role string.
  const role = resolveActiveRole(
    user as { role?: string | null; activeRole?: string | null; roles?: string[] | string | null } | undefined
  );

  if (role === "admin" || role === "demoadmin") {
    redirect("/dashboard/admin/settings");
  } else if (role === "rider") {
    redirect("/dashboard/rider/settings");
  } else if (role === "vendor") {
    redirect("/dashboard/vendor/settings");
  } else {
    redirect("/dashboard/customer/settings");
  }
}
