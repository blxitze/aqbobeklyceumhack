import { AlertTriangle } from "lucide-react";

import ReportsClient from "@/components/teacher/ReportsClient";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TeacherReportsPage() {
  const session = await requireAuth("TEACHER");
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: session.user.id },
    include: {
      scheduleSlots: {
        include: {
          class: {
            include: {
              students: true,
            },
          },
        },
      },
    },
  });

  if (!teacherProfile) {
    return (
      <Card className="border-red-200 bg-red-50/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            Профиль учителя не найден
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const classMap = new Map<string, { id: string; name: string; studentCount: number }>();
  for (const slot of teacherProfile.scheduleSlots) {
    classMap.set(slot.classId, {
      id: slot.class.id,
      name: slot.class.name,
      studentCount: slot.class.students.length,
    });
  }

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Отчёты по классам</h1>
        <p className="text-sm text-muted-foreground">
          {session.user.name}, выберите класс для генерации отчёта
        </p>
      </div>
      <ReportsClient classes={Array.from(classMap.values())} />
    </section>
  );
}
