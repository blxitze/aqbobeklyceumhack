import type { ReactNode } from "react";

import StudentLayout from "@/components/student/StudentLayout";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type LayoutProps = {
  children: ReactNode;
};

export default async function Layout({ children }: LayoutProps) {
  const session = await requireAuth("STUDENT");
  const studentProfile = await prisma.studentProfile.findFirst({
    where: { userId: session.user.id },
    include: { class: true },
  });

  return (
    <StudentLayout
      studentName={session.user.name}
      className={studentProfile?.class.name ?? "Класс не назначен"}
    >
      {children}
    </StudentLayout>
  );
}
