"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Layers } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { setActiveRole } from "@/lib/action/user";
import { useDashboardRole } from "@/hooks/useDashboardRole";

/**
 * The shell's own housekeeping, mounted once by the dashboard layout.
 *
 * Two jobs, both caused by the same thing: the URL is now the answer to "which
 * dashboard is this", while the account still carries an `activeRole` hint that
 * other readers (the buying rules, the notification feed, the legacy role
 * string) consult.
 *
 * 1. Say out loud which dashboard the reader is in. One toast per workspace,
 *    replaced rather than stacked, so moving between pages inside a dashboard
 *    never spams them. This is the answer to "am I in my shop or in my buyer
 *    account?" — the sidebar chip, the header chip and the toast all say the
 *    same word because all three read the same path.
 *
 * 2. Bring the session hint back in line with the page. The switcher used to
 *    write the hint first and only then navigate, so every refusal (a role an
 *    admin revoked, a parked dashboard, a network failure) became an error toast
 *    and the reader stayed put — unable to reach a dashboard they genuinely
 *    hold. Now navigation never waits for the write: this component makes the
 *    write afterwards, and if it fails, nothing breaks. The page they are on is
 *    already correct.
 */
export default function DashboardWorkspaceSync() {
  const router = useRouter();
  const { refetch } = authClient.useSession();
  const { user, workspace, label, heldRoles, canEnter } = useDashboardRole();

  // Remembered per account, so signing out and in again re-announces.
  const announced = useRef("");
  const mirrored = useRef("");
  const key = `${user?.id ?? "anon"}:${workspace}`;

  // ── 1. Say which dashboard this is ────────────────────────────────────────
  useEffect(() => {
    if (!user || announced.current === key) return;
    announced.current = key;
    toast.info(`You are in the ${label} dashboard`, {
      // One toast for the whole app: a new workspace replaces the old note
      // instead of piling up behind it.
      toastId: "dashboard-workspace",
      icon: <Layers className="w-4 h-4" />,
      autoClose: 2600,
    });
  }, [key, label, user]);

  // ── 2. Repair the session hint the URL has outgrown ───────────────────────
  //
  // Only a value the switch endpoint will accept is ever sent: the buyer, rider
  // or seller entry the account holds, or `admin` for staff who hold it. The
  // sandbox account's own entry cannot be written by that endpoint at all, so a
  // demo admin leaves the hint alone rather than collecting a refusal.
  const mirrorTarget =
    workspace === "customer" && heldRoles.includes("customer")
      ? "customer"
      : workspace === "vendor" && heldRoles.includes("vendor")
        ? "vendor"
        : workspace === "rider" && heldRoles.includes("rider")
          ? "rider"
          : workspace === "admin" && heldRoles.includes("admin")
            ? "admin"
            : null;
  const sessionHint = String(user?.activeRole || user?.role || "").toLowerCase();

  useEffect(() => {
    if (!user || !mirrorTarget || !canEnter(workspace)) return;
    if (mirrored.current === key) return;
    if (sessionHint === mirrorTarget) {
      mirrored.current = key;
      return;
    }
    mirrored.current = key;

    (async () => {
      try {
        await setActiveRole(mirrorTarget);
        // The hint belongs to a row better-auth only partly knows about, so the
        // cached session is read again with the cookie cache bypassed and the
        // route is re-rendered from it. A failed re-read is not a failed visit:
        // the page on screen already came from the URL.
        try {
          await refetch({ query: { disableCookieCache: true } });
        } catch {
          // The refresh below re-reads the session on its own.
        }
        router.refresh();
      } catch {
        // Nothing to tell the reader. They are where they asked to be.
      }
    })();
  }, [canEnter, key, mirrorTarget, refetch, router, sessionHint, user, workspace]);

  // The shell draws everything else; this only keeps the two in step.
  return null;
}
