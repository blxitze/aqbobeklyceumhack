"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  bestSubject?: string | null;
  worstSubject?: string | null;
};

type WeeklySummaryResponse = {
  summary: string;
  stats: WeeklySummaryStats;
  generatedAt: string;
};

type CachedSummaryPayload = WeeklySummaryResponse & {
  childId: string;
};

type WeeklySummaryPanelProps = {
  childId: string;
  childName: string;
};

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const REFRESH_COOLDOWN_MS = 60 * 60 * 1000;

function normalizeSummaryResponse(input: WeeklySummaryResponse): WeeklySummaryResponse {
  return {
    ...input,
    stats: {
      ...input.stats,
      subjectSummary: input.stats.subjectSummary ?? [],
      worryingSubjects: input.stats.worryingSubjects ?? [],
      goodSubjects: input.stats.goodSubjects ?? [],
      missedLessons: input.stats.missedLessons ?? 0,
      bestSubject: input.stats.bestSubject ?? null,
      worstSubject: input.stats.worstSubject ?? null,
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

function readValidCache(storageKey: string, childId: string): CachedSummaryPayload | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CachedSummaryPayload>;
    if (parsed.childId !== childId || !parsed.generatedAt || !parsed.summary || !parsed.stats) {
      return null;
    }
    const age = Date.now() - new Date(parsed.generatedAt).getTime();
    if (Number.isNaN(age) || age < 0 || age > CACHE_MAX_AGE_MS) {
      return null;
    }
    return {
      ...normalizeSummaryResponse(parsed as WeeklySummaryResponse),
      childId: parsed.childId,
    } as CachedSummaryPayload;
  } catch {
    return null;
  }
}

function saveCache(storageKey: string, childId: string, payload: WeeklySummaryResponse): void {
  if (typeof window === "undefined") return;
  const cached: CachedSummaryPayload = {
    ...normalizeSummaryResponse(payload),
    childId,
  };
  sessionStorage.setItem(storageKey, JSON.stringify(cached));
}

export default function WeeklySummaryPanel({ childId, childName }: WeeklySummaryPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WeeklySummaryResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  /** Avoid duplicate auto-fetch (Strict Mode / re-renders) for the same child. */
  const lastAutoInitChildRef = useRef<string | null>(null);
  const storageKey = `parent-summary-${childId}`;

  const fetchSummary = useCallback(async () => {
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

      const normalized = normalizeSummaryResponse(payload);
      setData(normalized);
      saveCache(storageKey, childId, normalized);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось получить сводку");
    } finally {
      setLoading(false);
    }
  }, [childId, storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (lastAutoInitChildRef.current === childId) return;

    const cached = readValidCache(storageKey, childId);
    if (cached) {
      setData({
        summary: cached.summary,
        stats: cached.stats,
        generatedAt: cached.generatedAt,
      });
      lastAutoInitChildRef.current = childId;
      return;
    }

    lastAutoInitChildRef.current = childId;
    void fetchSummary();
  }, [childId, storageKey, fetchSummary]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 4500);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  function handleRefresh() {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { childId?: string; generatedAt?: string };
        if (parsed.childId === childId && parsed.generatedAt) {
          const elapsed = Date.now() - new Date(parsed.generatedAt).getTime();
          if (!Number.isNaN(elapsed) && elapsed >= 0 && elapsed < REFRESH_COOLDOWN_MS) {
            setToastMessage("Сводка обновлялась менее часа назад");
            return;
          }
        }
      } catch {
        /* allow refresh */
      }
    }

    void fetchSummary();
  }

  const bestSubject =
    data?.stats.goodSubjects?.[0] ??
    data?.stats.subjectSummary?.find((subject) => subject.finalPercent !== null)?.subject ??
    "Нет данных";
  const warningSubject = data?.stats.worryingSubjects?.[0] ?? "Нет";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Недельная сводка для {childName}</p>
        {data ? (
          <Button size="sm" onClick={() => handleRefresh()} disabled={loading}>
            Обновить
          </Button>
        ) : null}
      </div>

      {toastMessage ? (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {toastMessage}
        </p>
      ) : null}

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
        <p className="text-sm text-muted-foreground">Загрузка сводки…</p>
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
