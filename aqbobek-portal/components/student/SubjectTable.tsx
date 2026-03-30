"use client";

import type { SubjectAverage } from "@/components/student/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type SubjectTableProps = {
  subjectAverages: SubjectAverage[];
};

function percentLabel(value: number | null): string {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function percentColor(value: number | null): string {
  if (value === null) return "text-muted-foreground";
  if (value < 40) return "text-red-600";
  if (value < 65) return "text-amber-600";
  return "text-emerald-600";
}

function gradeBadgeClass(grade: SubjectAverage["predictedGrade"]): string {
  if (grade === 5) return "bg-emerald-100 text-emerald-700";
  if (grade === 4) return "bg-blue-100 text-blue-700";
  if (grade === 3) return "bg-amber-100 text-amber-700";
  if (grade === 2) return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

export default function SubjectTable({ subjectAverages }: SubjectTableProps) {
  const rows = [...subjectAverages].sort((a, b) => {
    const left = a.finalPercent ?? -1;
    const right = b.finalPercent ?? -1;
    return left - right;
  });

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Нет данных по предметам</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Предмет</TableHead>
          <TableHead>ФО%</TableHead>
          <TableHead>СОР%</TableHead>
          <TableHead>СОЧ%</TableHead>
          <TableHead>Итог%</TableHead>
          <TableHead>Оценка</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          return (
            <TableRow key={row.subject} className="hover:bg-muted/60">
              <TableCell className="font-medium">{row.subject}</TableCell>
              <TableCell className={percentColor(row.foPercent)}>{percentLabel(row.foPercent)}</TableCell>
              <TableCell className={percentColor(row.sorPercent)}>{percentLabel(row.sorPercent)}</TableCell>
              <TableCell className={percentColor(row.socPercent)}>{percentLabel(row.socPercent)}</TableCell>
              <TableCell className={`font-semibold ${percentColor(row.finalPercent)}`}>
                {percentLabel(row.finalPercent)}
              </TableCell>
              <TableCell>
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${gradeBadgeClass(row.predictedGrade)}`}
                >
                  {row.predictedGrade ? `${row.predictedGrade} — ${row.gradeLabel}` : "—"}
                </span>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
