import ScheduleGrid from "@/components/admin/ScheduleGrid";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { todayLocalISO } from "@/lib/date-utils";

export default async function AdminSchedulePage() {
  await requireAuth("ADMIN");

  const classes = await prisma.class.findMany({ orderBy: { name: "asc" } });
  const teacherProfiles = await prisma.teacherProfile.findMany({
    include: { user: { select: { name: true } } },
    orderBy: { user: { name: "asc" } },
  });

  const teachers = teacherProfiles.map((t: typeof teacherProfiles[number]) => ({
    id: t.id,
    userName: t.user.name,
  }));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-medium mb-6">Умное расписание</h1>
      <ScheduleGrid
        classes={classes.map((c: typeof classes[number]) => ({ id: c.id, name: c.name }))}
        teachers={teachers}
        initialDate={todayLocalISO()}
      />
    </div>
  );
}
