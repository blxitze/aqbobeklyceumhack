"use client";

import type { SubjectAverage } from "@/components/student/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SubjectTableProps = {
  subjectAverages: SubjectAverage[];
};

function letterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

function trendLabel(trend: SubjectAverage["trend"]): { icon: string; className: string } {
  if (trend === "improving") return { icon: "↑", className: "text-emerald-600" };
  if (trend === "declining") return { icon: "↓", className: "text-red-600" };
  return { icon: "→", className: "text-gray-500" };
}

export default function SubjectTable({ subjectAverages }: SubjectTableProps) {
  const rows = [...subjectAverages].sort((a, b) => a.average - b.average);

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Нет данных по предметам</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Предмет</TableHead>
          <TableHead>Средний балл</TableHead>
          <TableHead>Тренд</TableHead>
          <TableHead>Оценка</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const trend = trendLabel(row.trend);

          return (
            <TableRow key={row.subject} className="hover:bg-muted/60">
              <TableCell className="font-medium">{row.subject}</TableCell>
              <TableCell>{row.average.toFixed(1)}</TableCell>
              <TableCell>
                <span className={`text-base font-semibold ${trend.className}`}>{trend.icon}</span>
              </TableCell>
              <TableCell>{letterGrade(row.average)}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
