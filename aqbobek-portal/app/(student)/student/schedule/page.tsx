import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateToIsoWeekday, todayLocalISO } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TIME_SLOTS = [1, 2, 3, 4, 5, 6] as const;

const WEEKDAYS = [
  { iso: 1, label: "Пн" },
  { iso: 2, label: "Вт" },
  { iso: 3, label: "Ср" },
  { iso: 4, label: "Чт" },
  { iso: 5, label: "Пт" },
] as const;

export default async function SchedulePage() {
  const session = await requireAuth("STUDENT");

  const studentProfile = await prisma.studentProfile.findFirst({
    where: { userId: session.user.id },
    include: { class: true },
  });

  if (!studentProfile) {
    return (
      <Card className="border-amber-200 bg-amber-50/70">
        <CardHeader>
          <CardTitle className="text-base">Профиль не найден</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Не удалось загрузить класс для расписания.
          </p>
        </CardContent>
      </Card>
    );
  }

  const slots = await prisma.scheduleSlot.findMany({
    where: { classId: studentProfile.classId, isActive: true },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
    },
    orderBy: [{ dayOfWeek: "asc" }, { timeSlot: "asc" }],
  });

  const cellKey = (day: number, slot: number) => `${day}-${slot}`;
  const grid = new Map<
    string,
    { subject: string; room: string; teacherName: string }
  >();

  for (const row of slots) {
    if (row.timeSlot < 1 || row.timeSlot > 6) continue;
    if (row.dayOfWeek < 1 || row.dayOfWeek > 5) continue;
    const key = cellKey(row.dayOfWeek, row.timeSlot);
    if (!grid.has(key)) {
      grid.set(key, {
        subject: row.subject,
        room: row.room,
        teacherName: row.teacher.user.name,
      });
    }
  }

  const highlightDay = dateToIsoWeekday(todayLocalISO());

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Расписание</h1>
        <p className="text-sm text-muted-foreground">
          Класс: {studentProfile.class.name} • слоты 1–6, будни
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Недельное расписание</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {slots.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Для вашего класса пока нет занятий в базе — сетка ниже пустая.
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Урок</TableHead>
                {WEEKDAYS.map(({ iso, label }) => (
                  <TableHead
                    key={iso}
                    className={cn(
                      "min-w-[120px] text-center",
                      highlightDay === iso &&
                        "bg-blue-100 font-bold text-primary dark:bg-primary/20",
                    )}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIME_SLOTS.map((slot) => (
                <TableRow key={slot}>
                  <TableCell className="font-medium text-muted-foreground">
                    {slot}
                  </TableCell>
                  {WEEKDAYS.map(({ iso }) => {
                    const cell = grid.get(cellKey(iso, slot));
                    const isTodayCol = highlightDay === iso;
                    return (
                      <TableCell
                        key={iso}
                        className={cn(
                          "align-top text-center text-sm",
                          isTodayCol &&
                            "bg-blue-50 ring-1 ring-blue-200 dark:bg-primary/15 dark:ring-primary/25",
                        )}
                      >
                        {cell ? (
                          <div className="space-y-0.5">
                            <p className="font-medium leading-tight">
                              {cell.subject}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              каб. {cell.room}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {cell.teacherName}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  );
}
