"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AnalyticsResponse, RiskLevel } from "@/components/student/types";

type RiskPanelProps = {
  analytics: AnalyticsResponse;
};

function riskLevelLabel(level: RiskLevel): string {
  if (level === "high") return "Высокий риск";
  if (level === "medium") return "Средний риск";
  return "Низкий риск";
}

function riskLevelClass(level: RiskLevel): string {
  if (level === "high") return "bg-red-100 text-red-700";
  if (level === "medium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function barClass(score: number): string {
  if (score > 70) return "bg-red-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function RiskPanel({ analytics }: RiskPanelProps) {
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (!showToast) return;
    const timer = setTimeout(() => setShowToast(false), 2500);
    return () => clearTimeout(timer);
  }, [showToast]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Общий уровень риска</p>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${riskLevelClass(analytics.riskLevel)}`}>
          {riskLevelLabel(analytics.riskLevel)}
        </span>
      </div>

      {analytics.attendanceWarning ? (
        <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm text-orange-700">
          ⚠ Посещаемость ниже 80% — это влияет на успеваемость
        </div>
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

      <Button className="w-full" onClick={() => setShowToast(true)}>
        Получить AI-совет
      </Button>

      {showToast ? (
        <div className="fixed right-4 bottom-4 z-50 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground shadow-md">
          AI-тьютор будет доступен скоро
        </div>
      ) : null}
    </div>
  );
}
