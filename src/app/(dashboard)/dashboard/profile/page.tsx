import { getUserSession } from "@/lib/core/session";
import { resolveActiveRole } from "@/lib/core/roles";
import { redirect } from "next/navigation";

export default async function DashboardProfileRedirectPage() {
  const user = await getUserSession();
  // The active dashboard decides the profile, not the legacy role string: a
  // vendor switched into their buyer workspace lands on the buyer profile.
  const role = resolveActiveRole(
    user as { role?: string | null; activeRole?: string | null; roles?: string[] | string | null } | undefined
  );

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
