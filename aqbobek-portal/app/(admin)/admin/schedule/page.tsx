import ScheduleManager from "@/components/admin/ScheduleManager";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export default async function AdminSchedule() {
  await requireAuth("ADMIN");

  const today = new Date();
  const [classes, teachers, scheduleSlots, substitutions] = await Promise.all([
    prisma.class.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.teacherProfile.findMany({
      include: {
        user: { select: { name: true } },
        scheduleSlots: true,
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.scheduleSlot.findMany({ where: { isActive: true } }),
    prisma.substitution.findMany({
      where: { date: { gte: startOfDay(today), lte: endOfDay(today) } },
      include: { originalTeacher: { include: { user: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Умное расписание</h1>
        <p className="text-sm text-muted-foreground">
          Управление расписанием и заменами учителей
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Сетка расписания и замены</CardTitle>
        </CardHeader>
        <CardContent>
          <ScheduleManager
            classes={classes}
            teachers={teachers.map((teacher) => ({ id: teacher.id, name: teacher.user.name }))}
            scheduleSlots={scheduleSlots.map((slot) => ({
              id: slot.id,
              classId: slot.classId,
              teacherId: slot.teacherId,
              subject: slot.subject,
              room: slot.room,
              dayOfWeek: slot.dayOfWeek,
              timeSlot: slot.timeSlot,
            }))}
            substitutions={substitutions.map((item) => ({
              id: item.id,
              date: item.date.toISOString().slice(0, 10),
              reason: item.reason,
              originalTeacherName: item.originalTeacher.user.name,
            }))}
          />
        </CardContent>
      </Card>
    </section>
  );
}
