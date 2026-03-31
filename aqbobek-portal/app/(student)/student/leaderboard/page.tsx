import { requireAuth } from "@/lib/auth";
import { computeKazakhGrade } from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/shared/Avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = {
  id: string;
  name: string;
  finalPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
};

function medalForPosition(position: number): string {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "";
}

export default async function LeaderboardPage() {
  const session = await requireAuth("STUDENT");

  const me = await prisma.studentProfile.findFirst({
    where: { userId: session.user.id },
    include: { class: true },
  });

  if (!me) {
    return (
      <Card className="border-amber-200 bg-amber-50/70">
        <CardHeader>
          <CardTitle className="text-base">Профиль не найден</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Не удалось определить ваш класс.</p>
        </CardContent>
      </Card>
    );
  }

  const classmates = await prisma.studentProfile.findMany({
    where: { classId: me.classId },
    include: {
      user: { select: { name: true } },
      grades: true,
    },
  });

  const rows: Row[] = classmates.map((student) => {
    const overall = computeKazakhGrade(student.grades);
    return {
      id: student.id,
      name: student.user.name,
      finalPercent: overall.finalPercent,
      predictedGrade: overall.predictedGrade,
    };
  });

  rows.sort((a, b) => {
    if (a.finalPercent === null && b.finalPercent === null) return a.name.localeCompare(b.name, "ru");
    if (a.finalPercent === null) return 1;
    if (b.finalPercent === null) return -1;
    if (b.finalPercent !== a.finalPercent) return b.finalPercent - a.finalPercent;
    return a.name.localeCompare(b.name, "ru");
  });

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Лидерборд</h1>
        <p className="text-sm text-muted-foreground">
          Класс {me.class.name} • по итоговому проценту (ФО/СОР/СОЧ)
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Рейтинг класса</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">В классе пока нет учеников.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Имя</TableHead>
                  <TableHead className="text-right">Итог %</TableHead>
                  <TableHead className="text-right">Оценка</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, index) => {
                  const position = index + 1;
                  const isMe = row.id === me.id;
                  const medal = medalForPosition(position);
                  return (
                    <TableRow
                      key={row.id}
                      className={cn(isMe && "bg-primary/10 font-medium ring-1 ring-primary/25")}
                    >
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          {medal ? <span aria-hidden>{medal}</span> : null}
                          <span>{position}</span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar name={row.name} size="sm" />
                          <span>{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.finalPercent !== null ? `${row.finalPercent.toFixed(1)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.predictedGrade !== null ? row.predictedGrade : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
