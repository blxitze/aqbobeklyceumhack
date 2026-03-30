"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type WeeklySummaryStats = {
  subjectSummary: Array<{
    subject: string;
    finalPercent: number | null;
    predictedGrade: 2 | 3 | 4 | 5 | null;
    gradeLabel: string;
    socPercent: number | null;
    trend: "improving" | "declining" | "stable";
  }>;
  missedLessons: number;
  worryingSubjects: string[];
  goodSubjects: string[];
};

type WeeklySummaryResponse = {
  summary: string;
  stats: WeeklySummaryStats;
  generatedAt: string;
};

type WeeklySummaryPanelProps = {
  childId: string;
  childName: string;
};

function normalizeSummaryResponse(input: WeeklySummaryResponse): WeeklySummaryResponse {
  return {
    ...input,
    stats: {
      ...input.stats,
      subjectSummary: input.stats.subjectSummary ?? [],
      worryingSubjects: input.stats.worryingSubjects ?? [],
      goodSubjects: input.stats.goodSubjects ?? [],
      missedLessons: input.stats.missedLessons ?? 0,
    },
  };
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function WeeklySummaryPanel({ childId, childName }: WeeklySummaryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeeklySummaryResponse | null>(null);
  const storageKey = `parent-summary-${childId}`;

  async function loadSummary() {
    if (data) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/parent-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: childId }),
      });
      const payload = (await response.json()) as WeeklySummaryResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось получить сводку");
      }

      setData(normalizeSummaryResponse(payload));
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, JSON.stringify(normalizeSummaryResponse(payload)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось получить сводку");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const cached = sessionStorage.getItem(storageKey);
    if (!cached) return;

    try {
      setData(normalizeSummaryResponse(JSON.parse(cached) as WeeklySummaryResponse));
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  const bestSubject =
    data?.stats.goodSubjects?.[0] ??
    data?.stats.subjectSummary?.find((subject) => subject.finalPercent !== null)?.subject ??
    "Нет данных";
  const warningSubject = data?.stats.worryingSubjects?.[0] ?? "Нет";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Недельная сводка для {childName}</p>
        <Button size="sm" onClick={() => void loadSummary()} disabled={loading}>
          Обновить сводку
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      ) : null}

      {!loading && error ? (
        <Card className="border-red-200 bg-red-50/70">
          <CardContent className="p-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      {!loading && !error && !data ? (
        <p className="text-sm text-muted-foreground">Нажмите кнопку для получения сводки</p>
      ) : null}

      {!loading && data ? (
        <>
          <p className="text-xs text-muted-foreground">Обновлено: {formatDateTime(data.generatedAt)}</p>

          <Card className="bg-amber-50/40">
            <CardContent className="p-4 text-sm leading-6 whitespace-pre-line">{data.summary}</CardContent>
          </Card>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
              ✓ {bestSubject} — хорошо
            </span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
              ⚠ {warningSubject} — требует внимания
            </span>
            <span
              className={`rounded-full px-3 py-1 ${
                data.stats.missedLessons > 2
                  ? "bg-red-100 text-red-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              ✗ Пропущено уроков: {data.stats.missedLessons}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
}
