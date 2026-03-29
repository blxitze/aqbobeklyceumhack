import type { ReactNode } from "react";

import AdminLayout from "@/components/admin/AdminLayout";
import { requireAuth } from "@/lib/auth";

type LayoutProps = {
  children: ReactNode;
};

export default async function Layout({ children }: LayoutProps) {
  await requireAuth("ADMIN");
  return <AdminLayout>{children}</AdminLayout>;
}
