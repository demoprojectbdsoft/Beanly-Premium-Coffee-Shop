import React from "react";
import type { LayoutProps } from "@/types";

/**
 * The `/dashboard` group draws nothing itself, on purpose.
 *
 * This layout used to carry the whole chrome — sidebar, header, phone bar — and
 * picked which workspace to draw straight from the URL. That made the chrome
 * reachable by URL alone: the guard that refuses a workspace sits in the
 * workspace's own layout, one level *below* this, so its refusal arrives after
 * this layout has already been sent. A customer who typed `/dashboard/admin`
 * watched the admin desk appear, heard the "You are in the Admin dashboard"
 * note, and only then bounced to the forbidden page. The page behind the
 * sidebar was never served, but the sidebar itself was: the names of the
 * admin's screens are a map of the store's back office.
 *
 * So the chrome moved down into `DashboardShell`, and each workspace layout
 * mounts it after its own guard has approved the account. What is left here is
 * the pass-through that keeps the group's routes under one folder without
 * putting anything on screen ahead of a check.
 */
export default function DashboardLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
