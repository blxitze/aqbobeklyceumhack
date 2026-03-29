import { AlertTriangle } from "lucide-react";
import { headers } from "next/headers";

import ClassPerformanceChart from "@/components/teacher/ClassPerformanceChart";
import EarlyWarningSystem from "@/components/teacher/EarlyWarningSystem";
import CollapsibleSection from "@/components/shared/CollapsibleSection";
import type { TeacherClassWithStudents, TeacherStudent } from "@/components/teacher/types";
import type { StudentFromClassResponse } from "@/components/student/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { riskLevelFromAverage, trendFromSubjectAverages } from "@/lib/teacher-analytics";

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
    [...student.subjectAverages].sort((a, b) => a.average - b.average)[0]?.subject ?? "";

  return {
    id: student.id,
    name: student.name,
    classId: student.classId,
    className: student.className,
    averageScore: student.averageScore,
    attendanceRate: student.attendanceRate,
    subjectAverages: student.subjectAverages,
    riskLevel: riskLevelFromAverage(student.averageScore),
    weakestSubject,
    trend: trendFromSubjectAverages(student.subjectAverages),
  };
}

export default async function TeacherDashboardPage() {
  const session = await requireAuth("TEACHER");
  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { userId: session.user.id },
    include: { scheduleSlots: { include: { class: true } } },
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

  const uniqueClassIds = [...new Set(teacherProfile.scheduleSlots.map((slot) => slot.classId))];
  const classNameById = new Map<string, string>();
  for (const slot of teacherProfile.scheduleSlots) {
    classNameById.set(slot.classId, slot.class.name);
  }

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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Мои классы</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{uniqueClassIds.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Учеников всего</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{allStudents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">В зоне риска</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${highRiskCount > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {highRiskCount}
            </p>
          </CardContent>
        </Card>
      </div>

      <CollapsibleSection
        title="Early Warning System"
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
