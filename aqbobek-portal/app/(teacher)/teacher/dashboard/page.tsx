import { AlertTriangle, BarChart3, CheckCircle, Users } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";

import ClassPerformanceChart from "@/components/teacher/ClassPerformanceChart";
import EarlyWarningSystem from "@/components/teacher/EarlyWarningSystem";
import CollapsibleSection from "@/components/shared/CollapsibleSection";
import { StatCard } from "@/components/shared/StatCard";
import type { TeacherClassWithStudents, TeacherStudent } from "@/components/teacher/types";
import type { StudentFromClassResponse } from "@/components/student/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { trendFromSubjectAverages } from "@/lib/teacher-analytics";
import { dateToIsoWeekday, todayLocalISO } from "@/lib/date-utils";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

function formatDate(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

async function fetchClassStudents(
  baseUrl: string,
  cookieHeader: string,
  classId: string,
): Promise<ApiResult<StudentFromClassResponse[]>> {
  try {
    const response = await fetch(
      `${baseUrl}/api/bilimclass/students?classId=${encodeURIComponent(classId)}`,
      {
        headers: { cookie: cookieHeader },
        cache: "no-store",
      },
    );
    const json = (await response.json()) as StudentFromClassResponse[] & { error?: string };
    if (!response.ok) {
      return {
        data: null,
        error: typeof json.error === "string" ? json.error : "Ошибка загрузки учеников",
      };
    }
    return { data: json as StudentFromClassResponse[], error: null };
  } catch {
    return { data: null, error: "Сетевая ошибка при загрузке учеников" };
  }
}

function toTeacherStudent(student: StudentFromClassResponse): TeacherStudent {
  const weakestSubject =
    [...student.subjectAverages].sort(
      (a, b) => (a.finalPercent ?? -1) - (b.finalPercent ?? -1),
    )[0]?.subject ?? "";

  const riskLevel: TeacherStudent["riskLevel"] =
    (student.finalPercent !== null && student.finalPercent < 40) ||
    (student.socPercent !== null && student.socPercent < 40)
      ? "high"
      : student.finalPercent !== null && student.finalPercent < 65
        ? "medium"
        : student.finalPercent === null
          ? "medium"
          : "low";

  return {
    id: student.id,
    name: student.name,
    classId: student.classId,
    className: student.className,
    finalPercent: student.finalPercent,
    socPercent: student.socPercent,
    predictedGrade: student.predictedGrade,
    attendanceRate: student.attendanceRate,
    subjectAverages: student.subjectAverages,
    riskLevel,
    weakestSubject,
    trend: trendFromSubjectAverages(student.subjectAverages),
  };
}

const DAY_LABELS: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс",
};

export default async function TeacherDashboardPage() {
  const session = await requireAuth("TEACHER");
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: session.user.id },
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

  const todayDow = dateToIsoWeekday(todayLocalISO());

  const todaySlots = await prisma.scheduleSlot.findMany({
    where: {
      teacherId: teacherProfile.id,
      dayOfWeek: todayDow,
      isActive: true,
    },
    include: { class: true },
    orderBy: [{ timeSlot: "asc" }],
  });

  const allTeacherSlots = await prisma.scheduleSlot.findMany({
    where: {
      teacherId: teacherProfile.id,
      isActive: true,
    },
    include: { class: true },
    orderBy: [{ dayOfWeek: "asc" }, { timeSlot: "asc" }],
  });

  const teacherClasses = await prisma.scheduleSlot.findMany({
    where: { teacherId: teacherProfile.id, isActive: true },
    include: {
      class: {
        include: {
          _count: {
            select: { students: true },
          },
        },
      },
    },
    distinct: ["classId"],
    orderBy: [{ classId: "asc" }],
  });
  const uniqueClasses = teacherClasses.map((slot) => slot.class);
  const uniqueClassIds = uniqueClasses.map((classItem) => classItem.id);
  const classNameById = new Map(uniqueClasses.map((classItem) => [classItem.id, classItem.name]));

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";

  const classResults = await Promise.all(
    uniqueClassIds.map(async (classId) => ({
      classId,
      className: classNameById.get(classId) ?? classId,
      result: await fetchClassStudents(baseUrl, cookieHeader, classId),
    })),
  );

  const errors = classResults
    .filter((item) => item.result.error)
    .map((item) => `${item.className}: ${item.result.error}`);

  const classes: TeacherClassWithStudents[] = classResults.map((item) => ({
    classId: item.classId,
    className: item.className,
    students: (item.result.data ?? []).map(toTeacherStudent),
  }));

  const allStudents = classes.flatMap((classData) => classData.students);
  const highRiskCount = allStudents.filter((student) => student.riskLevel === "high").length;
  const averageScore =
    allStudents.length > 0
      ? allStudents.reduce((sum, student) => sum + (student.finalPercent ?? 0), 0) / allStudents.length
      : 0;
  const attendanceRate =
    allStudents.length > 0
      ? allStudents.reduce((sum, student) => sum + student.attendanceRate, 0) / allStudents.length
      : 0;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Добро пожаловать, {session.user.name}!</h1>
        <p className="text-sm text-muted-foreground">
          {teacherProfile.subjects.join(", ") || "Предметы не указаны"} • {formatDate()}
        </p>
      </div>

      {errors.length > 0 ? (
        <Card className="border-red-200 bg-red-50/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base text-red-700">
              <AlertTriangle className="h-4 w-4" />
              Ошибка загрузки данных
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-red-700">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Моё расписание на сегодня ({DAY_LABELS[todayDow] ?? `День ${todayDow}`})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todaySlots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сегодня нет уроков.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {todaySlots.map((row) => (
                <li key={row.id} className="text-muted-foreground">
                  Урок {row.timeSlot} — {row.subject} — {row.class.name} — каб.{row.room}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Учеников всего"
          value={allStudents.length}
          subtitle={`Мои классы: ${uniqueClassIds.length}`}
          icon={Users}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
        />
        <StatCard
          label="В зоне риска"
          value={highRiskCount}
          icon={AlertTriangle}
          iconColor="text-red-500"
          iconBg="bg-red-50"
        />
        <StatCard
          label="Средний балл"
          value={`${averageScore.toFixed(1)}%`}
          icon={BarChart3}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-50"
        />
        <StatCard
          label="Посещаемость"
          value={`${attendanceRate.toFixed(1)}%`}
          icon={CheckCircle}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Мои классы</CardTitle>
        </CardHeader>
        <CardContent>
          {uniqueClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">У вас пока нет назначенных классов.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {uniqueClasses.map((classItem) => (
                <article key={classItem.id} className="rounded-lg border p-4">
                  <p className="text-base font-semibold">{classItem.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Учеников: {classItem._count.students}
                  </p>
                  <Link
                    href={`/teacher/class/${classItem.id}`}
                    className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    Открыть класс →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CollapsibleSection
        title="Система раннего предупреждения"
        badge={highRiskCount}
        badgeColor="red"
        defaultOpen={false}
      >
        <EarlyWarningSystem students={allStudents} />
      </CollapsibleSection>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Успеваемость по классам</CardTitle>
        </CardHeader>
        <CardContent>
          <ClassPerformanceChart classes={classes} />
        </CardContent>
      </Card>
    </section>
  );
}
