"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { GradeItem, SubjectSummary } from "@/components/student/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export interface GradesChartProps {
  grades: GradeItem[];
  subjectSummaries?: SubjectSummary[];
}

const SUBJECT_ORDER = ["Математика", "Физика", "Информатика", "История", "Биология"];

const TYPE_COLORS = {
  CURRENT: "#3b82f6",
  SOR: "#f97316",
  SOC: "#ef4444",
} as const;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function averagePercent(grades: GradeItem[]): number | null {
  if (grades.length === 0) return null;
  const totalScore = grades.reduce((sum, grade) => sum + grade.score, 0);
  const totalMaxScore = grades.reduce((sum, grade) => sum + grade.maxScore, 0);
  if (totalMaxScore === 0) return null;
  return Math.round((totalScore / totalMaxScore) * 100);
}

function percentLabel(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

type ChartPointPayload = {
  id: string;
  date: string;
  currentPercent: number | null;
  sorPercent: number | null;
  socPercent: number | null;
  rawScore: string;
  typeLabel: string;
};

type RechartsTooltipPayloadEntry = {
  value?: number | string;
  payload?: ChartPointPayload;
};

function renderGradesTooltip(props: unknown) {
  if (!props || typeof props !== "object") return null;
  const { active, payload } = props as {
    active?: boolean;
    payload?: ReadonlyArray<RechartsTooltipPayloadEntry>;
  };
  if (!active || !payload || payload.length === 0) return null;
  const point = payload.find(
    (entry: RechartsTooltipPayloadEntry) =>
      entry && entry.value !== null && entry.value !== undefined && entry.payload,
  );
  if (!point?.payload) return null;
  const row = point.payload;
  const type = String(row.typeLabel ?? "");
  const percent = Number(point.value);
  const date = String(row.date ?? "");
  const rawScore = String(row.rawScore ?? "—");

  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{`${type} — ${rawScore} (${percent}%) — ${date}`}</p>
    </div>
  );
}

export default function GradesChart({ grades, subjectSummaries = [] }: GradesChartProps) {
  if (grades.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
        Нет данных
      </div>
    );
  }

  const subjects = useMemo(() => {
    const fromData = Array.from(new Set(grades.map((grade) => grade.subject)));
    return SUBJECT_ORDER.filter((subject) => fromData.includes(subject)).concat(
      fromData.filter((subject) => !SUBJECT_ORDER.includes(subject)),
    );
  }, [grades]);
  const [activeSubject, setActiveSubject] = useState(subjects[0] ?? "");

  const selectedSubject = subjects.includes(activeSubject) ? activeSubject : subjects[0];
  const subjectGrades = useMemo(
    () =>
      [...grades]
        .filter((grade) => grade.subject === selectedSubject)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [grades, selectedSubject],
  );

  const chartData = subjectGrades.map((grade) => ({
    id: grade.id,
    date: formatDate(grade.date),
    currentPercent: grade.type === "CURRENT" ? grade.percent : null,
    sorPercent: grade.type === "SOR" ? grade.percent : null,
    socPercent: grade.type === "SOC" ? grade.percent : null,
    rawScore: `${grade.score}/${grade.maxScore}`,
    typeLabel: grade.typeLabel,
  }));

  const currentAvg = averagePercent(subjectGrades.filter((grade) => grade.type === "CURRENT"));
  const sorAvg = averagePercent(subjectGrades.filter((grade) => grade.type === "SOR"));
  const socAvg = averagePercent(subjectGrades.filter((grade) => grade.type === "SOC"));

  const safeSummaries = Array.isArray(subjectSummaries) ? subjectSummaries : [];
  const summariesBySubject = Object.fromEntries(
    safeSummaries.map((summary) => [summary.subject, summary]),
  ) as Record<string, SubjectSummary>;
  const selectedSummary = summariesBySubject[selectedSubject];

  return (
    <div className="space-y-4">
      <Tabs value={selectedSubject} onValueChange={setActiveSubject}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1">
          {subjects.map((subject) => (
            <TabsTrigger key={subject} value={subject}>
              {subject}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedSubject} className="space-y-3">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={chartData} margin={{ top: 12, right: 20, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: "%", angle: -90, position: "insideLeft" }}
              />
              <ReferenceLine y={85} stroke="#16a34a" strokeDasharray="5 5" label={{ value: "5", fill: "#16a34a" }} />
              <ReferenceLine y={65} stroke="#2563eb" strokeDasharray="5 5" label={{ value: "4", fill: "#2563eb" }} />
              <ReferenceLine y={40} stroke="#eab308" strokeDasharray="5 5" label={{ value: "3", fill: "#a16207" }} />
              <Tooltip content={renderGradesTooltip} />

              <Line
                type="linear"
                dataKey="currentPercent"
                name="ФО"
                connectNulls
                stroke={TYPE_COLORS.CURRENT}
                strokeWidth={2}
                dot={{ r: 3, fill: TYPE_COLORS.CURRENT }}
              />
              <Line
                type="linear"
                dataKey="sorPercent"
                name="СОР"
                connectNulls
                stroke={TYPE_COLORS.SOR}
                strokeWidth={2}
                dot={(props: { cx?: number; cy?: number }) => {
                  const { cx, cy } = props;
                  if (typeof cx !== "number" || typeof cy !== "number") return null;
                  const r = 5;
                  return (
                    <polygon
                      points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
                      fill={TYPE_COLORS.SOR}
                    />
                  );
                }}
              />
              <Line
                type="linear"
                dataKey="socPercent"
                name="СОЧ"
                connectNulls
                stroke={TYPE_COLORS.SOC}
                strokeWidth={3}
                dot={{ r: 6, fill: TYPE_COLORS.SOC, stroke: "#ffffff", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">ФО</p>
              <p className="text-lg font-semibold">{percentLabel(currentAvg)}</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">СОР</p>
              <p className="text-lg font-semibold">{percentLabel(sorAvg)}</p>
            </div>
            <div className="rounded-md border p-3 text-center">
              <p className="text-xs text-muted-foreground">СОЧ</p>
              <p className="text-lg font-semibold">{percentLabel(socAvg)}</p>
            </div>
          </div>

          <p className="text-sm font-medium">
            Итог: {percentLabel(selectedSummary?.finalPercent ?? null)} {"\u2192"} Оценка{" "}
            {selectedSummary?.predictedGrade ?? "—"} ({selectedSummary?.gradeLabel ?? "—"})
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
