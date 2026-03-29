"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Grade } from "@/components/student/types";

type GradesChartProps = {
  grades: Grade[];
};

const SUBJECT_COLORS: Record<string, string> = {
  Математика: "#6366f1",
  Физика: "#f59e0b",
  Информатика: "#10b981",
  История: "#ec4899",
  Биология: "#14b8a6",
};

const DEFAULT_COLOR = "#6b7280";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export default function GradesChart({ grades }: GradesChartProps) {
  if (grades.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Нет данных
      </div>
    );
  }

  const sortedGrades = [...grades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const subjects = Array.from(new Set(sortedGrades.map((grade) => grade.subject)));
  const dataMap = new Map<string, Record<string, number | string | null>>();

  for (const grade of sortedGrades) {
    const dateKey = new Date(grade.date).toISOString().slice(0, 10);
    const existing = dataMap.get(dateKey) ?? { date: formatDate(grade.date), fullDate: grade.date };
    existing[grade.subject] = grade.score;
    existing.fullDate = grade.date;
    dataMap.set(dateKey, existing);
  }

  const chartData = Array.from(dataMap.values()).map((row) => {
    const normalized: Record<string, number | string | null> = { ...row };
    for (const subject of subjects) {
      if (!(subject in normalized)) {
        normalized[subject] = null;
      }
    }
    return normalized;
  });

  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value, name) => [`${Number(value ?? 0)} баллов`, String(name)]}
          labelFormatter={(_, payload) => {
            const fullDate = payload?.[0]?.payload?.fullDate;
            if (!fullDate) return "";
            return new Intl.DateTimeFormat("ru-RU", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(new Date(String(fullDate)));
          }}
        />
        {subjects.map((subject) => (
          <Line
            key={subject}
            type="linear"
            dataKey={subject}
            connectNulls={true}
            stroke={SUBJECT_COLORS[subject] ?? DEFAULT_COLOR}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
        <Legend verticalAlign="bottom" height={36} />
      </LineChart>
    </ResponsiveContainer>
  );
}
