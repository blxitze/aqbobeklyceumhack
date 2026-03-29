import type { ReactNode } from "react";

import TeacherLayout from "@/components/teacher/TeacherLayout";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type LayoutProps = {
  children: ReactNode;
};

export default async function Layout({ children }: LayoutProps) {
  const session = await requireAuth("TEACHER");
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: session.user.id },
    include: { scheduleSlots: true },
  });

  const firstClassId = teacherProfile?.scheduleSlots[0]?.classId ?? null;

  return (
    <TeacherLayout
      teacherName={session.user.name}
      subjects={teacherProfile?.subjects ?? []}
      firstClassId={firstClassId}
    >
      {children}
    </TeacherLayout>
  );
}
