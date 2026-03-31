import { AlertTriangle, CheckCircle, Star, TrendingUp } from "lucide-react";
import { headers } from "next/headers";

import WeeklySummaryPanel from "@/components/parent/WeeklySummaryPanel";
import { StatCard } from "@/components/shared/StatCard";
import GradesChart from "@/components/student/GradesChart";
import SubjectTable from "@/components/student/SubjectTable";
import type { AnalyticsResponse, GradesResponse, SubjectAverage } from "@/components/student/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
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
      headers: { cookie: cookieHeader },
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

export default async function ParentDashboard() {
  const session = await requireAuth("PARENT");
  const parentProfile = await prisma.parentProfile.findFirst({
    where: { userId: session.user.id },
    include: {
      child: {
        include: {
          class: true,
          user: true,
        },
      },
    },
  });

  if (!parentProfile?.child) {
    return (
      <ErrorCard
        title="Профиль не найден"
        message="Не удалось определить профиль ребёнка для текущего родителя."
      />
    );
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";

  const childId = parentProfile.child.id;
  const [grades, analytics] = await Promise.all([
    fetchBilimclass<GradesResponse>(
      baseUrl,
      cookieHeader,
      `/api/bilimclass/grades?studentId=${encodeURIComponent(childId)}`,
    ),
    fetchBilimclass<AnalyticsResponse>(
      baseUrl,
      cookieHeader,
      `/api/bilimclass/analytics?studentId=${encodeURIComponent(childId)}`,
    ),
  ]);

  const subjectAverages: SubjectAverage[] =
    analytics.data?.subjectRisks.map((risk) => ({
      subject: risk.subject,
      foPercent: risk.foPercent,
      sorPercent: risk.sorPercent,
      socPercent: risk.socPercent,
      finalPercent: risk.finalPercent,
      predictedGrade: risk.predictedGrade,
      gradeLabel: risk.gradeLabel,
      trend: risk.trend,
    })) ?? [];

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Здравствуйте, {session.user.name}!</h1>
        <p className="text-sm text-muted-foreground">
          Вы наблюдаете за: {parentProfile.child.user.name}, {parentProfile.child.class.name} •{" "}
          {formatCurrentDate()}
        </p>
      </div>

      {grades.error ? <ErrorCard title="Ошибка загрузки оценок" message={grades.error} /> : null}
      {analytics.error ? <ErrorCard title="Ошибка загрузки аналитики" message={analytics.error} /> : null}

      {grades.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Итоговый % ребёнка"
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
            label="Требует внимания"
            value={grades.data.summary.weakestSubject || "—"}
            subtitle={analytics.data?.riskLevel === "high" ? "Повышенный риск" : undefined}
            icon={AlertTriangle}
            iconColor="text-red-500"
            iconBg="bg-red-50"
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Динамика оценок ребёнка</CardTitle>
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
            <CardTitle className="text-lg">Недельная AI-сводка</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklySummaryPanel childId={childId} childName={parentProfile.child.user.name} />
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
