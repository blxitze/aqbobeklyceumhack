"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type AtRiskStudent = {
  studentId: string;
  name: string;
  className: string;
  averageScore: number;
  riskScore: number;
  weakestSubject: string;
};

export default function AtRiskSummary() {
  const [rows, setRows] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/at-risk?limit=10");
      const payload = (await response.json()) as AtRiskStudent[] & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Не удалось загрузить список рисков");
      setRows(payload as AtRiskStudent[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить список рисков");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function notifyTeacher(student: AtRiskStudent) {
    await fetch("/api/admin/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Риск по ученику ${student.name}`,
        body: `Ученик ${student.name} (${student.className}) имеет риск ${Math.round(
          student.riskScore,
        )} и слабый предмет: ${student.weakestSubject}.`,
        targetRole: "TEACHER",
      }),
    });
  }

  if (loading) return <p className="text-sm text-muted-foreground">Загрузка...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Учеников в зоне риска нет</p>;

  return (
    <div className="space-y-3">
      {rows.map((student) => (
        <div key={student.studentId} className="rounded-lg border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{student.name}</p>
              <p className="text-xs text-muted-foreground">
                {student.className} • {student.averageScore.toFixed(1)} балла
              </p>
            </div>
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
              Риск {Math.round(student.riskScore)}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Слабый предмет: {student.weakestSubject}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={() => void notifyTeacher(student)}>
            Уведомить учителя
          </Button>
        </div>
      ))}
    </div>
  );
}
