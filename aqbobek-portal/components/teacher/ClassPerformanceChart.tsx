"use client";

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

import type { TeacherClassWithStudents } from "@/components/teacher/types";

type ClassPerformanceChartProps = {
  classes: TeacherClassWithStudents[];
};

const SUBJECTS = ["Математика", "Физика", "Информатика", "История", "Биология"];
const BAR_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444"];

export default function ClassPerformanceChart({ classes }: ClassPerformanceChartProps) {
  if (classes.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center text-sm text-muted-foreground">
        Нет данных для графика
      </div>
    );
  }

  const data = SUBJECTS.map((subject) => {
    const row: Record<string, string | number> = { subject };

    for (const classData of classes) {
      const values = classData.students
        .map(
          (student) =>
            student.subjectAverages.find((item) => item.subject === subject)?.finalPercent ?? 0,
        )
        .filter((score) => score > 0);

      row[classData.className] =
        values.length === 0
          ? 0
          : Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
    }

    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 16 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
        <ReferenceLine
          y={75}
          stroke="#6b7280"
          strokeDasharray="4 4"
          label={{ value: "Порог", position: "insideTopRight", fill: "#6b7280", fontSize: 12 }}
        />
        <Tooltip
          formatter={(value, name) => [`${Number(value ?? 0).toFixed(1)}%`, String(name)]}
        />
        <Legend />
        {classes.map((classData, index) => (
          <Bar
            key={classData.classId}
            dataKey={classData.className}
            fill={BAR_COLORS[index % BAR_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
