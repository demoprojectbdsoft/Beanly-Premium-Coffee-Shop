"use client";

import { authClient } from "@/lib/auth-client";
import { toast } from "react-toastify";

/**
 * Hook that detects if the currently logged-in user is a "demoAdmin".
 * demoAdmin can browse all admin pages but cannot perform any
 * create / update / delete actions.
 *
 * Usage in any handler:
 *   const { guardDemo } = useDemoAdmin();
 *   const handleSave = async () => {
 *     if (guardDemo()) return;  // ← stops here for demoAdmin
 *     // ... real logic
 *   };
 */
export function useDemoAdmin() {
  const { data: session } = authClient.useSession();
  const role = (session?.user as any)?.role as string | undefined;
  const isDemoAdmin = role?.toLowerCase() === "demoadmin";

  /**
   * Call this at the top of every CUD handler.
   * Returns `true` (and shows a toast) when the user is a demoAdmin,
   * so the caller should `return` immediately.
   */
  const guardDemo = (message = "This is a demo account. Changes are disabled.") => {
    if (isDemoAdmin) {
      toast.info(message, { toastId: "demo-guard" });
      return true;
    }
    return false;
  };

  return { isDemoAdmin, guardDemo };
}
