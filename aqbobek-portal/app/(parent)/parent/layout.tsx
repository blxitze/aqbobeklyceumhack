import type { ReactNode } from "react";

import ParentLayout from "@/components/parent/ParentLayout";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type LayoutProps = {
  children: ReactNode;
};

export default async function Layout({ children }: LayoutProps) {
  const session = await requireAuth("PARENT");
  const parentProfile = await prisma.parentProfile.findFirst({
    where: { userId: session.user.id },
    include: {
      child: {
        include: {
          user: true,
        },
      },
    },
  });

  return (
    <ParentLayout
      parentName={session.user.name}
      childName={parentProfile?.child.user.name ?? "ребёнка"}
      userEmail={session.user.email}
    >
      {children}
    </ParentLayout>
  );
}
