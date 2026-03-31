import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { dateToIsoWeekday, todayLocalISO } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

const TIME_SLOTS = [1, 2, 3, 4, 5, 6] as const;
const WEEKDAYS = [
  { iso: 1, label: "Пн" },
  { iso: 2, label: "Вт" },
  { iso: 3, label: "Ср" },
  { iso: 4, label: "Чт" },
  { iso: 5, label: "Пт" },
] as const;

function getDateForDayOfWeek(dow: number): Date {
  const today = new Date();
  const currentDow = today.getDay() === 0 ? 7 : today.getDay();
  const diff = dow - currentDow;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function TeacherSchedulePage() {
  const session = await requireAuth("TEACHER");
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: session.user.id },
  });

  if (!teacherProfile) {
    return (
      <Card className="border-amber-200 bg-amber-50/70">
        <CardHeader>
          <CardTitle className="text-base">Профиль учителя не найден</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const today = todayLocalISO();
  const todayDow = dateToIsoWeekday(today);
  const now = new Date();
  const currentDow = now.getDay() === 0 ? 7 : now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - currentDow + 1);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  weekEnd.setHours(23, 59, 59, 999);
  const [slots, substitutions] = await Promise.all([
    prisma.scheduleSlot.findMany({
      where: { teacherId: teacherProfile.id, isActive: true },
      include: { class: true },
      orderBy: [{ dayOfWeek: "asc" }, { timeSlot: "asc" }],
    }),
    prisma.substitution.findMany({
      where: {
        originalTeacherId: teacherProfile.id,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    }),
  ]);

  const cellKey = (day: number, timeSlot: number) => `${day}-${timeSlot}`;
  const grid = new Map<string, { subject: string; className: string; room: string }>();

  for (const slot of slots) {
    if (slot.dayOfWeek < 1 || slot.dayOfWeek > 5) continue;
    if (slot.timeSlot < 1 || slot.timeSlot > 6) continue;
    const key = cellKey(slot.dayOfWeek, slot.timeSlot);
    if (!grid.has(key)) {
      grid.set(key, {
        subject: slot.subject,
        className: slot.class.name,
        room: slot.room,
      });
    }
  }

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Расписание</h1>
        <p className="text-sm text-muted-foreground">Моя неделя (Пн–Пт)</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Недельное расписание</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Урок</TableHead>
                {WEEKDAYS.map(({ iso, label }) => (
                  <TableHead
                    key={iso}
                    className={cn(
                      "min-w-[150px] text-center",
                      iso === todayDow && "bg-blue-100 font-bold text-primary dark:bg-primary/20",
                    )}
                  >
                    {label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIME_SLOTS.map((timeSlot) => (
                <TableRow key={timeSlot}>
                  <TableCell className="font-medium text-muted-foreground">{timeSlot}</TableCell>
                  {WEEKDAYS.map(({ iso }) => {
                    const cell = grid.get(cellKey(iso, timeSlot));
                    const slotDate = getDateForDayOfWeek(iso);
                    const isSubstituted = Boolean(
                      cell &&
                        substitutions.find(
                          (s) => s.date.toDateString() === slotDate.toDateString(),
                        ),
                    );
                    return (
                      <TableCell key={iso} className="align-top text-center text-sm">
                        {cell ? (
                          <div
                            className={cn(
                              "space-y-0.5",
                              isSubstituted && "rounded border border-amber-200 bg-amber-50 p-1",
                            )}
                          >
                            <p className="font-medium leading-tight">{cell.subject}</p>
                            <p className="text-xs text-muted-foreground">{cell.className}</p>
                            <p className="text-xs text-muted-foreground">каб. {cell.room}</p>
                            {isSubstituted ? (
                              <p className="mt-1 text-xs text-amber-700">⚠️ Вы заменены</p>
                            ) : null}
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
