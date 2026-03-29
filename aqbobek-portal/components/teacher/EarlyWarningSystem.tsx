"use client";

import { Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { RiskLevel, TeacherStudent } from "@/components/teacher/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type EarlyWarningSystemProps = {
  students: TeacherStudent[];
};

type SortKey = "name" | "averageScore" | "attendanceRate" | "trend" | "riskLevel" | "weakestSubject";
type SortDirection = "asc" | "desc";

const SUBJECTS = ["Математика", "Физика", "Информатика", "История", "Биология"];

function riskLabel(level: RiskLevel): string {
  if (level === "high") return "Высокий риск";
  if (level === "medium") return "Средний риск";
  return "Норма";
}

function riskClass(level: RiskLevel): string {
  if (level === "high") return "bg-red-100 text-red-700";
  if (level === "medium") return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function scoreClass(score: number): string {
  if (score < 60) return "text-red-600";
  if (score < 75) return "text-amber-600";
  return "text-emerald-600";
}

function trendView(trend: TeacherStudent["trend"]): { icon: string; className: string } {
  if (trend === "improving") return { icon: "↑", className: "text-emerald-600" };
  if (trend === "declining") return { icon: "↓", className: "text-red-600" };
  return { icon: "→", className: "text-gray-500" };
}

function comparableTrendValue(trend: TeacherStudent["trend"]): number {
  if (trend === "declining") return 0;
  if (trend === "stable") return 1;
  return 2;
}

function comparableRiskValue(risk: RiskLevel): number {
  if (risk === "high") return 0;
  if (risk === "medium") return 1;
  return 2;
}

function SortHeader({
  label,
  column,
  sortKey,
  sortDirection,
  onSort,
}: {
  label: string;
  column: SortKey;
  sortKey: SortKey;
  sortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = sortKey === column;
  return (
    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(column)}>
      {label}
      <span className="text-xs text-muted-foreground">{active ? (sortDirection === "asc" ? "▲" : "▼") : "↕"}</span>
    </button>
  );
}

export default function EarlyWarningSystem({ students }: EarlyWarningSystemProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState<"all" | RiskLevel>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("averageScore");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const classOptions = useMemo(() => {
    return Array.from(new Set(students.map((student) => student.className))).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return students
      .filter((student) => {
        if (normalizedQuery && !student.name.toLowerCase().includes(normalizedQuery)) return false;
        if (classFilter !== "all" && student.className !== classFilter) return false;
        if (riskFilter !== "all" && student.riskLevel !== riskFilter) return false;
        if (subjectFilter !== "all" && student.weakestSubject !== subjectFilter) return false;
        return true;
      })
      .sort((a, b) => {
        let compare = 0;

        if (sortKey === "name") compare = a.name.localeCompare(b.name, "ru");
        if (sortKey === "averageScore") compare = a.averageScore - b.averageScore;
        if (sortKey === "attendanceRate") compare = a.attendanceRate - b.attendanceRate;
        if (sortKey === "trend") compare = comparableTrendValue(a.trend) - comparableTrendValue(b.trend);
        if (sortKey === "riskLevel") compare = comparableRiskValue(a.riskLevel) - comparableRiskValue(b.riskLevel);
        if (sortKey === "weakestSubject") compare = a.weakestSubject.localeCompare(b.weakestSubject, "ru");

        return sortDirection === "asc" ? compare : -compare;
      });
  }, [students, query, classFilter, riskFilter, subjectFilter, sortKey, sortDirection]);

  const riskCount = filtered.filter((student) => student.riskLevel === "high").length;

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по имени" value={query} onChange={(event) => setQuery(event.target.value)} className="pl-8" />
        </div>
        <select
          value={classFilter}
          onChange={(event) => setClassFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Все классы</option>
          {classOptions.map((className) => (
            <option key={className} value={className}>
              {className}
            </option>
          ))}
        </select>
        <select
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value as "all" | RiskLevel)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Все</option>
          <option value="high">Высокий риск</option>
          <option value="medium">Средний риск</option>
          <option value="low">Норма</option>
        </select>
        <select
          value={subjectFilter}
          onChange={(event) => setSubjectFilter(event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="all">Все предметы</option>
          {SUBJECTS.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-muted-foreground">
        Показано {filtered.length} из {students.length} учеников | В зоне риска: {riskCount}
      </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortHeader label="Ученик" column="name" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </TableHead>
            <TableHead>
              <SortHeader
                label="Средний балл"
                column="averageScore"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortHeader
                label="Посещаемость"
                column="attendanceRate"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>
              <SortHeader label="Тренд" column="trend" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </TableHead>
            <TableHead>
              <SortHeader label="Риск" column="riskLevel" sortKey={sortKey} sortDirection={sortDirection} onSort={onSort} />
            </TableHead>
            <TableHead>
              <SortHeader
                label="Худший предмет"
                column="weakestSubject"
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={onSort}
              />
            </TableHead>
            <TableHead>Действие</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((student) => {
            const trend = trendView(student.trend);
            const attendanceWarning = student.attendanceRate < 80;
            return (
              <TableRow
                key={student.id}
                className={cn(student.riskLevel === "high" ? "bg-red-50/60 hover:bg-red-100/60" : "")}
              >
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium">{student.name}</p>
                    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {student.className}
                    </span>
                  </div>
                </TableCell>
                <TableCell className={`font-semibold ${scoreClass(student.averageScore)}`}>
                  {student.averageScore.toFixed(1)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span>{student.attendanceRate.toFixed(1)}%</span>
                    {attendanceWarning ? <TriangleAlert className="h-4 w-4 text-amber-500" /> : null}
                  </div>
                </TableCell>
                <TableCell className={trend.className}>
                  <span className="text-base font-semibold">{trend.icon}</span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${riskClass(student.riskLevel)}`}>
                    {riskLabel(student.riskLevel)}
                  </span>
                </TableCell>
                <TableCell>{student.weakestSubject || "—"}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/teacher/class/${student.classId}`)}>
                    Подробнее
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
