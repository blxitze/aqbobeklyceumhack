"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type SubjectBreakdown = {
  subject: string;
  finalPercent: number;
  predictedGrade: 2 | 3 | 4 | 5;
};

type ByClass = {
  className: string;
  studentCount: number;
  averagePercent: number | null;
  predictedGradeAvg: number | null;
  atRiskCount: number;
  gradeDistribution: {
    five: number;
    four: number;
    three: number;
    two: number;
  };
  subjectBreakdown: SubjectBreakdown[];
};

type StatsResponse = {
  byClass?: ByClass[];
};

const SUBJECT_COLORS: Record<string, string> = {
  Математика: "#6366f1",
  Физика: "#f59e0b",
  Информатика: "#10b981",
  История: "#ec4899",
  Биология: "#14b8a6",
};

export default function GlobalPerformanceChart() {
  const [byClass, setByClass] = useState<ByClass[]>([]);
  const [tab, setTab] = useState<"percent" | "grade">("percent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/admin/stats");
        const payload = (await response.json()) as StatsResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Не удалось загрузить статистику");
        setByClass(payload.byClass ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить статистику");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const percentChartData = useMemo(() => {
    return byClass.map((classItem) => {
      const row: Record<string, number | string> = { className: classItem.className };
      for (const subject of classItem.subjectBreakdown) {
        row[subject.subject] = subject.finalPercent;
        row[`${subject.subject}__grade`] = subject.predictedGrade;
      }
      return row;
    });
  }, [byClass]);

  const gradeDistributionData = useMemo(() => {
    return byClass.map((classItem) => ({
      className: classItem.className,
      "2": classItem.gradeDistribution.two,
      "3": classItem.gradeDistribution.three,
      "4": classItem.gradeDistribution.four,
      "5": classItem.gradeDistribution.five,
    }));
  }, [byClass]);

  const subjectsInData = useMemo(() => {
    return Array.from(
      new Set(byClass.flatMap((classItem) => classItem.subjectBreakdown.map((subject) => subject.subject))),
    );
  }, [byClass]);

  if (loading) {
    return <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Загрузка...</div>;
  }
  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }
  if (byClass.length === 0) {
    return <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Нет данных</div>;
  }

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-md border p-1">
        <button
          type="button"
          onClick={() => setTab("percent")}
          className={`rounded px-3 py-1 text-sm ${tab === "percent" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          По процентам
        </button>
        <button
          type="button"
          onClick={() => setTab("grade")}
          className={`rounded px-3 py-1 text-sm ${tab === "grade" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          По оценкам (2/3/4/5)
        </button>
      </div>

      {tab === "percent" ? (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={percentChartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="className" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} label={{ value: "%", angle: -90, position: "insideLeft" }} />
            <Tooltip
              formatter={(value, name, item) => {
                const subject = String(name);
                const row = item.payload as Record<string, number | string | undefined>;
                const grade = Number(row[`${subject}__grade`] ?? 0);
                const className = String(row.className ?? "");
                return [`Класс ${className} — ${subject}: ${Number(value ?? 0)}% (оценка ${grade})`, subject];
              }}
            />
            <Legend />
            {subjectsInData.map((subject) => (
              <Bar key={subject} dataKey={subject} fill={SUBJECT_COLORS[subject] ?? "#6b7280"} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={gradeDistributionData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="className" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value, name) => [`${Number(value ?? 0)} учен.`, `Оценка ${String(name)}`]} />
            <Legend />
            <Bar dataKey="2" stackId="grades" fill="#ef4444" />
            <Bar dataKey="3" stackId="grades" fill="#eab308" />
            <Bar dataKey="4" stackId="grades" fill="#3b82f6" />
            <Bar dataKey="5" stackId="grades" fill="#22c55e" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
