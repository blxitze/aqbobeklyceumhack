import type { ReactNode } from "react";

import AdminLayout from "@/components/admin/AdminLayout";
import { requireAuth } from "@/lib/auth";

type LayoutProps = {
  children: ReactNode;
};

export default async function Layout({ children }: LayoutProps) {
  const session = await requireAuth("ADMIN");
  return <AdminLayout adminName={session.user.name} userEmail={session.user.email}>{children}</AdminLayout>;
}
