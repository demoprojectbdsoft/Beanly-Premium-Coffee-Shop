import { redirect } from "next/navigation";
import { getUserSession } from "@/lib/core/session";
import { resolveActiveRole, WORKSPACE_HREFS, type WorkspaceRole } from "@/lib/core/roles";

/**
 * "My Account" in the footer.
 *
 * There is no single account page to show: the account holds several roles at
 * once, and each workspace keeps its own profile, settings and order list,
 * because a rider's settings are availability and a vehicle while a buyer's are
 * addresses and payment. Sending everyone to one shared screen is how people
 * end up editing the wrong thing.
 *
 * So the link resolves instead of rendering: a reader is handed to the
 * dashboard their active role owns, and a visitor without a session is sent to
 * sign in and brought straight back here afterwards. Written as a route rather
 * than a redirect rule so it reads the live session, which a static rule cannot.
 */
export const dynamic = "force-dynamic";

export default async function MyAccountPage() {
  const user = await getUserSession();

  if (!user) {
    redirect("/auth/login?callbackUrl=%2Faccount");
  }

  const role = resolveActiveRole(user) as WorkspaceRole;
  redirect(WORKSPACE_HREFS[role] ?? WORKSPACE_HREFS.customer);
}
