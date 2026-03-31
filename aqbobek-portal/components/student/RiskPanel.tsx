"use client";

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { RiskBadge } from "@/components/shared/RiskBadge";
import { Button } from "@/components/ui/button";
import type { AnalyticsResponse, RiskLevel } from "@/components/student/types";

type RiskPanelProps = {
  analytics: AnalyticsResponse;
  currentStudentId: string;
};

const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

function cacheKey(studentId: string): string {
  return `tutor-text-${studentId}`;
}

function barClass(score: number): string {
  if (score > 70) return "bg-red-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

type TutorAnalysis = {
  riskLevel: string;
  rootProblem: string;
  studyPath: string[];
};

type TutorResponse = {
  text: string;
  analysis: TutorAnalysis | null;
  fallback?: boolean;
};

type TutorCachePayload = {
  text: string;
  analysis: TutorAnalysis | null;
  generatedAt: string;
};

export default function RiskPanel({ analytics, currentStudentId }: RiskPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<TutorAnalysis | null>(null);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const CACHE_KEY = cacheKey(currentStudentId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Partial<TutorCachePayload>;
      if (!parsed.text || !parsed.generatedAt) return;
      const age = Date.now() - new Date(parsed.generatedAt).getTime();
      if (Number.isNaN(age) || age < 0 || age >= COOLDOWN_MS) return;
      setAiText(parsed.text);
      setAiAnalysis(parsed.analysis ?? null);
    } catch {
      sessionStorage.removeItem(CACHE_KEY);
    }
  }, [CACHE_KEY]);

  useEffect(() => {
    if (!warningMessage) return;
    const t = window.setTimeout(() => setWarningMessage(null), 4500);
    return () => window.clearTimeout(t);
  }, [warningMessage]);

  const handleTutorRequest = useCallback(async () => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { generatedAt?: string };
          if (parsed.generatedAt) {
            const elapsed = Date.now() - new Date(parsed.generatedAt).getTime();
            if (!Number.isNaN(elapsed) && elapsed >= 0 && elapsed < COOLDOWN_MS) {
              setWarningMessage("AI-совет обновлялся менее часа назад");
              return;
            }
          }
        } catch {
          /* fetch fresh */
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ studentId: currentStudentId }),
      });

      const data = (await res.json()) as TutorResponse | { error?: string };
      if (!res.ok) {
        const message =
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Не удалось получить AI-совет";
        throw new Error(message);
      }

      const tutorData = data as TutorResponse;
      setAiText(tutorData.text);
      setAiAnalysis(tutorData.analysis);

      const payload: TutorCachePayload = {
        text: tutorData.text,
        analysis: tutorData.analysis,
        generatedAt: new Date().toISOString(),
      };
      if (typeof window !== "undefined") {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      }
    } catch {
      setAiText(null);
      setAiAnalysis(null);
      setError("Ошибка запроса. Попробуйте еще раз.");
    } finally {
      setIsLoading(false);
    }
  }, [CACHE_KEY, currentStudentId]);

  const buttonLabel = aiText ? "Обновить AI-совет" : "Получить AI-совет";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Общий уровень риска</p>
        <RiskBadge level={analytics.riskLevel as RiskLevel} />
      </div>

      {analytics.attendanceWarning ? (
        <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-700">
          ⚠ Посещаемость ниже 80% — это влияет на успеваемость
        </div>
      ) : null}

      {warningMessage ? (
        <p
          role="status"
          className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {warningMessage}
        </p>
      ) : null}

      <div className="space-y-4">
        {analytics.subjectRisks.map((subjectRisk) => (
          <div key={subjectRisk.subject} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-medium">{subjectRisk.subject}</p>
              <p className="text-xs text-muted-foreground">{Math.round(subjectRisk.riskScore)}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${barClass(subjectRisk.riskScore)}`}
                style={{ width: `${Math.min(subjectRisk.riskScore, 100)}%` }}
              />
            </div>

            {subjectRisk.missedTopics.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {subjectRisk.missedTopics.map((topic) => (
                  <span
                    key={`${subjectRisk.subject}-${topic}`}
                    className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Пропущенных тем нет</p>
            )}
          </div>
        ))}
      </div>

      <Button className="w-full" onClick={() => void handleTutorRequest()} disabled={isLoading}>
        {isLoading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка...
          </span>
        ) : (
          buttonLabel
        )}
      </Button>

      {error ? (
        <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {aiText ? (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-sm leading-6">{aiText}</p>
          {aiAnalysis ? (
            <div className="space-y-2 border-t border-primary/20 pt-3 text-xs text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Уровень риска:</span>{" "}
                {aiAnalysis.riskLevel}
              </p>
              <p>
                <span className="font-medium text-foreground">Корневая тема:</span>{" "}
                {aiAnalysis.rootProblem || "—"}
              </p>
              <p>
                <span className="font-medium text-foreground">Путь изучения:</span>{" "}
                {aiAnalysis.studyPath?.length ? aiAnalysis.studyPath.join(" -> ") : "—"}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
