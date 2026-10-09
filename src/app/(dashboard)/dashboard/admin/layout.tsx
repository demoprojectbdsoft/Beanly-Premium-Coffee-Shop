import { getRequiredRole } from "@/lib/core/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await getRequiredRole("admin");
  return <>
    {children}
  </>;
}
