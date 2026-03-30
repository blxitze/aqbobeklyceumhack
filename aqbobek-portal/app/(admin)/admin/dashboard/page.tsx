import GlobalPerformanceChart from "@/components/admin/GlobalPerformanceChart";
import AtRiskSummary from "@/components/admin/AtRiskSummary";
import CollapsibleSection from "@/components/shared/CollapsibleSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { computeKazakhGrade } from "@/lib/bilimclass";
import { attendanceRate, average } from "@/lib/admin-analytics";
import { prisma } from "@/lib/prisma";

function metricColor(value: number): string {
  if (value >= 85) return "text-emerald-600";
  if (value >= 65) return "text-blue-600";
  if (value >= 40) return "text-amber-600";
  return "text-red-600";
}

function formatDate(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

export default async function AdminDashboard() {
  await requireAuth("ADMIN");

  const [studentsCount, teachersCount, classesCount, grades, students, recentNotifications] =
    await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.user.count({ where: { role: "TEACHER" } }),
      prisma.class.count(),
      prisma.grade.findMany(),
      prisma.studentProfile.findMany({ include: { grades: true } }),
      prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    ]);

  const schoolKazakh = computeKazakhGrade(grades);
  const schoolFinalPercent = schoolKazakh.finalPercent;
  const atRiskStudents = students.filter((student) => {
    const bySubject = new Map<string, typeof student.grades>();
    for (const grade of student.grades) {
      const values = bySubject.get(grade.subject) ?? [];
      values.push(grade);
      bySubject.set(grade.subject, values);
    }
    const subjectFinalPercents = [...bySubject.values()]
      .map((subjectGrades) => computeKazakhGrade(subjectGrades).finalPercent)
      .filter((value): value is number => value !== null);

    if (subjectFinalPercents.length === 0) return false;

    const overallFinalPercent = average(subjectFinalPercents);
    const hasCriticalSubject = subjectFinalPercents.some((percent) => percent < 40);
    return hasCriticalSubject || overallFinalPercent < 50;
  }).length;
  const schoolAttendanceRate = attendanceRate(grades);

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Панель администратора</h1>
        <p className="text-sm text-muted-foreground">Aqbobek Lyceum • {formatDate()}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Всего учеников</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{studentsCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Всего учителей</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{teachersCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Классов</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{classesCount}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Итог % по школе (KZ)</CardTitle></CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-semibold ${
                schoolFinalPercent !== null ? metricColor(schoolFinalPercent) : "text-muted-foreground"
              }`}
            >
              {schoolFinalPercent !== null ? `${schoolFinalPercent.toFixed(1)}%` : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">В зоне риска</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${atRiskStudents > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {atRiskStudents}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Посещаемость</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-semibold">{schoolAttendanceRate.toFixed(1)}%</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader><CardTitle className="text-lg">Глобальная успеваемость</CardTitle></CardHeader>
          <CardContent><GlobalPerformanceChart /></CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-lg">Сводка по рискам</CardTitle></CardHeader>
          <CardContent>
            <CollapsibleSection
              title="Сводка по рискам"
              badge={atRiskStudents}
              badgeColor="red"
              defaultOpen={false}
            >
              <AtRiskSummary />
            </CollapsibleSection>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Последние уведомления</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Уведомлений пока нет</p>
            ) : (
              recentNotifications.map((notification) => (
                <div key={notification.id} className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-xs text-muted-foreground">{notification.body}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-lg">Быстрые действия</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Проверьте учеников из зоны риска.</p>
            <p>• Отправьте уведомления классным руководителям.</p>
            <p>• Обновите расписание на текущую неделю.</p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
