import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAuth } from "@/lib/auth";
import { computeKazakhGrade } from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";

const backToDashboardLinkClass =
  "inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAuth("TEACHER");
  const { id } = await params;

  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: session.user.id },
  });

  if (!teacherProfile) {
    return (
      <section className="space-y-4">
        <Link href="/teacher/dashboard" className={backToDashboardLinkClass}>
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Назад к дашборду
        </Link>
        <Card className="border-red-200 bg-red-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700">Профиль учителя не найден</CardTitle>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const cls = await prisma.class.findUnique({
    where: { id },
    include: {
      students: {
        include: {
          user: true,
          grades: true,
        },
      },
    },
  });

  if (!cls) {
    return (
      <section className="space-y-4">
        <Link href="/teacher/dashboard" className={backToDashboardLinkClass}>
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Назад к дашборду
        </Link>
        <Card className="border-red-200 bg-red-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700">Класс не найден</CardTitle>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const teachesThisClass = await prisma.scheduleSlot.findFirst({
    where: {
      teacherId: teacherProfile.id,
      classId: cls.id,
      isActive: true,
    },
  });

  if (!teachesThisClass) {
    return (
      <section className="space-y-4">
        <Link href="/teacher/dashboard" className={backToDashboardLinkClass}>
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Назад к дашборду
        </Link>
        <Card className="border-red-200 bg-red-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-700">Нет доступа к этому классу</CardTitle>
          </CardHeader>
        </Card>
      </section>
    );
  }

  const studentsWithGrades = cls.students
    .map((student) => {
      const gradeData = computeKazakhGrade(student.grades);
      return {
        id: student.id,
        name: student.user.name,
        finalPercent: gradeData.finalPercent,
        predictedGrade: gradeData.predictedGrade,
        gradeLabel: gradeData.gradeLabel,
        foPercent: gradeData.foPercent,
        sorPercent: gradeData.sorPercent,
        socPercent: gradeData.socPercent,
      };
    })
    .sort((a, b) => (a.finalPercent ?? 0) - (b.finalPercent ?? 0));

  const studentsWithFinal = studentsWithGrades.filter((student) => student.finalPercent !== null);
  const averageFinalPercent =
    studentsWithFinal.length === 0
      ? null
      : studentsWithFinal.reduce((sum, student) => sum + (student.finalPercent ?? 0), 0) /
        studentsWithFinal.length;
  const atRiskCount = studentsWithGrades.filter(
    (student) => student.finalPercent !== null && student.finalPercent < 40,
  ).length;

  return (
    <section className="space-y-6">
      <div>
        <Link href="/teacher/dashboard" className={`${backToDashboardLinkClass} mb-2 -ml-2`}>
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Назад к дашборду
        </Link>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{cls.name}</h1>
          <p className="text-sm text-muted-foreground">Учеников: {studentsWithGrades.length}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Средний итоговый процент</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{averageFinalPercent === null ? "—" : `${averageFinalPercent.toFixed(1)}%`}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ученики в зоне риска</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${atRiskCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {atRiskCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Успеваемость класса</CardTitle>
        </CardHeader>
        <CardContent>
          {studentsWithGrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">В этом классе пока нет учеников.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ученик</TableHead>
                  <TableHead>ФО%</TableHead>
                  <TableHead>СОР%</TableHead>
                  <TableHead>СОЧ%</TableHead>
                  <TableHead>Итог%</TableHead>
                  <TableHead>Оценка</TableHead>
                  <TableHead>Риск</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsWithGrades.map((student) => {
                  const isRisk = student.finalPercent !== null && student.finalPercent < 40;
                  return (
                    <TableRow key={student.id} className={isRisk ? "bg-red-50/60 hover:bg-red-100/60" : undefined}>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{formatPercent(student.foPercent)}</TableCell>
                      <TableCell>{formatPercent(student.sorPercent)}</TableCell>
                      <TableCell>{formatPercent(student.socPercent)}</TableCell>
                      <TableCell>{formatPercent(student.finalPercent)}</TableCell>
                      <TableCell>
                        {student.predictedGrade === null
                          ? "—"
                          : `${student.predictedGrade} (${student.gradeLabel})`}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            isRisk
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {isRisk ? "Риск" : "Норма"}
                        </span>
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
