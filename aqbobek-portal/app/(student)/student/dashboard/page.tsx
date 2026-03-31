import { Suspense } from "react";
import { AlertTriangle, CheckCircle, Star, TrendingUp } from "lucide-react";
import { headers } from "next/headers";

import GradesChart from "@/components/student/GradesChart";
import RiskPanel from "@/components/student/RiskPanel";
import SubjectTable from "@/components/student/SubjectTable";
import { StatCard } from "@/components/shared/StatCard";
import type {
  AnalyticsResponse,
  GradesResponse,
  StudentFromClassResponse,
} from "@/components/student/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

type DashboardApiData = {
  grades: ApiResult<GradesResponse>;
  analytics: ApiResult<AnalyticsResponse>;
  students: ApiResult<StudentFromClassResponse[]>;
};

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

async function fetchBilimclass<T>(
  baseUrl: string,
  cookieHeader: string,
  path: string,
): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    const json = (await response.json()) as T & { error?: string };

    if (!response.ok) {
      return {
        data: null,
        error: typeof json.error === "string" ? json.error : "Не удалось загрузить данные",
      };
    }

    return { data: json as T, error: null };
  } catch {
    return { data: null, error: "Ошибка сети при загрузке данных" };
  }
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-red-200 bg-red-50/70">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base text-red-700">
          <AlertTriangle className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-red-700">{message}</p>
      </CardContent>
    </Card>
  );
}

async function loadDashboardData(
  studentId: string,
  classId: string,
): Promise<DashboardApiData> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";

  const gradesPath = `/api/bilimclass/grades?studentId=${encodeURIComponent(studentId)}`;
  const analyticsPath = `/api/bilimclass/analytics?studentId=${encodeURIComponent(studentId)}`;
  const studentsPath = `/api/bilimclass/students?classId=${encodeURIComponent(classId)}`;

  const [grades, analytics, students] = await Promise.all([
    fetchBilimclass<GradesResponse>(baseUrl, cookieHeader, gradesPath),
    fetchBilimclass<AnalyticsResponse>(baseUrl, cookieHeader, analyticsPath),
    fetchBilimclass<StudentFromClassResponse[]>(baseUrl, cookieHeader, studentsPath),
  ]);

  return { grades, analytics, students };
}

async function DashboardContent() {
  const session = await requireAuth("STUDENT");
  const studentProfile = await prisma.studentProfile.findFirst({
    where: { userId: session.user.id },
    include: { class: true },
  });

  if (!studentProfile) {
    return (
      <ErrorCard title="Профиль не найден" message="Не удалось определить профиль студента для текущего пользователя." />
    );
  }

  const { grades, analytics, students } = await loadDashboardData(studentProfile.id, studentProfile.classId);
  const subjectAverages =
    students.data?.find((student) => student.id === studentProfile.id)?.subjectAverages ?? [];

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Привет, {session.user.name}! 👋</h1>
        <p className="text-sm text-muted-foreground">
          {studentProfile.class.name} • {formatCurrentDate()}
        </p>
      </div>

      {grades.error ? <ErrorCard title="Ошибка загрузки оценок" message={grades.error} /> : null}
      {analytics.error ? <ErrorCard title="Ошибка загрузки аналитики" message={analytics.error} /> : null}
      {students.error ? <ErrorCard title="Ошибка загрузки таблицы предметов" message={students.error} /> : null}

      {grades.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Итоговый процент"
            value={grades.data.summary.finalPercent !== null ? `${grades.data.summary.finalPercent.toFixed(1)}%` : "—"}
            icon={TrendingUp}
            iconColor="text-blue-500"
            iconBg="bg-blue-50"
          />
          <StatCard
            label="Посещаемость"
            value={`${grades.data.summary.attendanceRate.toFixed(1)}%`}
            icon={CheckCircle}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-50"
          />
          <StatCard
            label="Лучший предмет"
            value={grades.data.summary.bestSubject || "—"}
            icon={Star}
            iconColor="text-amber-500"
            iconBg="bg-amber-50"
          />
          <StatCard
            label="Слабый предмет"
            value={grades.data.summary.weakestSubject || "—"}
            subtitle={analytics.data?.riskLevel === "high" ? "Требует внимания" : undefined}
            icon={AlertTriangle}
            iconColor="text-red-500"
            iconBg="bg-red-50"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Динамика оценок</CardTitle>
          </CardHeader>
          <CardContent>
            <GradesChart
              grades={grades.data?.grades ?? []}
              subjectSummaries={analytics.data?.subjectRisks ?? []}
            />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Риски по предметам</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.data ? (
              <RiskPanel analytics={analytics.data} currentStudentId={studentProfile.id} />
            ) : (
              <p className="text-sm text-muted-foreground">Нет данных аналитики</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Разбивка по предметам</CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectTable subjectAverages={subjectAverages} />
        </CardContent>
      </Card>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-[360px] w-full lg:col-span-3" />
        <Skeleton className="h-[360px] w-full lg:col-span-2" />
      </div>
      <Skeleton className="h-64 w-full" />
    </section>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
