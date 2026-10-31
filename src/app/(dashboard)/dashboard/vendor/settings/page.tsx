import { redirect } from "next/navigation";

/**
 * The seller workspace has no separate account settings screen yet; the shared
 * mobile navigation still offers one. It lands on the store profile, which is
 * the only setting a vendor can change today, instead of a dead end.
 */
export default function VendorSettingsPage() {
  redirect("/dashboard/vendor/profile");
}
