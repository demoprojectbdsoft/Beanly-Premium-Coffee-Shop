"use client";

import React, { useState } from "react";
import type { LayoutProps } from "@/types";
import type { WorkspaceRole } from "@/lib/core/roles";
import DashboardNavbar from "./DashboardNavbar";
import AdminSidebar from "./AdminSidebar";
import CustomerSidebar from "./CustomerSidebar";
import RiderSidebar from "./RiderSidebar";
import VendorSidebar from "./VendorSidebar";
import DashboardWorkspaceSync from "./DashboardWorkspaceSync";
import MobileBottomNav from "@/components/shared/MobileBottomNav";

interface DashboardShellProps extends LayoutProps {
  /** The workspace the guard above just approved. */
  workspace: WorkspaceRole;
}

/**
 * The dashboard chrome: sidebar, header, the page area, and the phone bar.
 *
 * This used to live in the `/dashboard` layout, one level *above* every
 * workspace guard. A URL alone was therefore enough to paint a workspace: a
 * customer who typed `/dashboard/admin` had the admin sidebar and the "You are
 * in the Admin dashboard" note arrive on their screen a moment before the
 * server's refusal bounced them to the forbidden page. The links on that desk
 * (users, vendors, payouts, settings, ...) were the leak, even though the page
 * behind them never rendered.
 *
 * So the chrome moved below the guards: each workspace layout checks the
 * account's approved roles first and only then draws this. Nobody sees a
 * workspace they were not let into, because there is nothing above the refusal
 * to see.
 *
 * The sidebar is named by the `workspace` prop rather than re-read from the
 * path, so the chrome can only ever be the one the guard approved. The header,
 * the bell and the phone bar still resolve the workspace from the URL, because
 * inside a guarded workspace the path and the approval are the same answer.
 */
export default function DashboardShell({ workspace, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--surface-alt)] text-[var(--foreground)] transition-colors duration-200">
      {/* Says which dashboard this is, and keeps the session hint in step with
          it. Draws nothing. */}
      <DashboardWorkspaceSync />

      {/* Responsive Collapsible Sidebar */}
      {workspace === "admin" || workspace === "demoadmin" ? (
        <AdminSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      ) : workspace === "rider" ? (
        <RiderSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      ) : workspace === "vendor" ? (
        <VendorSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      ) : (
        <CustomerSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardNavbar
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        {/* Render Page Children */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 pb-20 md:pb-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Fixed Mobile Bottom Bar for responsive devices */}
      <MobileBottomNav />
    </div>
  );
}
