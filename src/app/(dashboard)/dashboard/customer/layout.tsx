import { getRequiredRole } from "@/lib/core/session";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  await getRequiredRole("customer");
  return <>
    {children}
  </>;
}
