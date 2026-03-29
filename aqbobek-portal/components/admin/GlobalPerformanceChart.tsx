"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ClassStats = {
  className: string;
  averageBySubject: Record<string, number>;
};

type StatsResponse = {
  classStats?: ClassStats[];
};

const SUBJECT_COLORS: Record<string, string> = {
  Математика: "#6366f1",
  Физика: "#f59e0b",
  Информатика: "#10b981",
  История: "#ec4899",
  Биология: "#14b8a6",
};
const SUBJECTS = Object.keys(SUBJECT_COLORS);

export default function GlobalPerformanceChart() {
  const [classStats, setClassStats] = useState<ClassStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/admin/stats");
        const payload = (await response.json()) as StatsResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Не удалось загрузить статистику");
        setClassStats(payload.classStats ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить статистику");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const chartData = useMemo(() => {
    return classStats.map((classItem) => {
      const row: Record<string, number | string> = { className: classItem.className };
      for (const subject of SUBJECTS) {
        row[subject] = classItem.averageBySubject[subject] ?? 0;
      }
      return row;
    });
  }, [classStats]);

  if (loading) {
    return <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Загрузка...</div>;
  }
  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }
  if (chartData.length === 0) {
    return <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">Нет данных</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="className" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <ReferenceLine
          y={75}
          stroke="#6b7280"
          strokeDasharray="4 4"
          label={{ value: "Норма", position: "insideTopRight", fill: "#6b7280", fontSize: 12 }}
        />
        <Tooltip formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}`, String(name)]} />
        <Legend />
        {SUBJECTS.map((subject) => (
          <Bar
            key={subject}
            dataKey={subject}
            fill={SUBJECT_COLORS[subject]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
