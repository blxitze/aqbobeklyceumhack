import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { headers } from "next/headers";

import { Avatar } from "@/components/shared/Avatar";
import { RiskBadge } from "@/components/shared/RiskBadge";
import RiskPanel from "@/components/student/RiskPanel";
import SubjectTable from "@/components/student/SubjectTable";
import type { AnalyticsResponse, GradesResponse, SubjectAverage } from "@/components/student/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Ghost-style link; avoid importing `buttonVariants` from client `button.tsx` in RSC. */
const backToDashboardLinkClass =
  "inline-flex w-fit items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50";

type ApiResult<T> = {
  data: T | null;
  error: string | null;
};

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

export default async function TeacherStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth("TEACHER");
  const { id } = await params;

  const profile = await prisma.studentProfile.findUnique({
    where: { id },
    include: { user: true, class: true },
  });

  if (!profile) {
    return (
      <section className="space-y-4">
        <Link href="/teacher/dashboard" className={backToDashboardLinkClass}>
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Назад к дашборду
        </Link>
        <ErrorCard title="Ученик не найден" message="Проверьте ссылку или вернитесь к списку на дашборде." />
      </section>
    );
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  const cookieHeader = requestHeaders.get("cookie") ?? "";
  const baseUrl = host ? `${protocol}://${host}` : "http://localhost:3000";

  const studentId = profile.id;
  const gradesPath = `/api/bilimclass/grades?studentId=${encodeURIComponent(studentId)}`;
  const analyticsPath = `/api/bilimclass/analytics?studentId=${encodeURIComponent(studentId)}`;

  const [grades, analytics] = await Promise.all([
    fetchBilimclass<GradesResponse>(baseUrl, cookieHeader, gradesPath),
    fetchBilimclass<AnalyticsResponse>(baseUrl, cookieHeader, analyticsPath),
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
      <div>
        <Link href="/teacher/dashboard" className={`${backToDashboardLinkClass} mb-2 -ml-2`}>
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Назад к дашборду
        </Link>
        <div className="flex items-center gap-4">
          <Avatar name={profile.user.name} size="lg" />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{profile.user.name}</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{profile.class.name}</p>
              {analytics.data ? <RiskBadge level={analytics.data.riskLevel} /> : null}
            </div>
          </div>
        </div>
      </div>

      {grades.error ? <ErrorCard title="Ошибка загрузки оценок" message={grades.error} /> : null}
      {analytics.error ? <ErrorCard title="Ошибка загрузки аналитики" message={analytics.error} /> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Разбивка по предметам</CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectTable subjectAverages={subjectAverages} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Риски по предметам</CardTitle>
        </CardHeader>
        <CardContent>
          {analytics.data ? (
            <RiskPanel analytics={analytics.data} currentStudentId={studentId} />
          ) : (
            <p className="text-sm text-muted-foreground">Нет данных аналитики</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
