import type { Grade } from "@prisma/client";

import type { RiskLevel, SubjectTrend } from "@/components/teacher/types";

export function averageScore(grades: Array<{ score: number }>): number {
  if (grades.length === 0) return 0;
  const avg = grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length;
  return Number(avg.toFixed(1));
}

export function attendanceRate(grades: Array<{ attendance: boolean }>): number {
  if (grades.length === 0) return 0;
  const attended = grades.filter((grade) => grade.attendance).length;
  return Number(((attended / grades.length) * 100).toFixed(1));
}

export function riskLevelFromAverage(score: number): RiskLevel {
  if (score < 60) return "high";
  if (score < 75) return "medium";
  return "low";
}

export function trendFromSubjectAverages(
  subjectAverages: Array<{ trend: SubjectTrend; average: number }>,
): SubjectTrend {
  const declining = subjectAverages.filter((item) => item.trend === "declining").length;
  const improving = subjectAverages.filter((item) => item.trend === "improving").length;

  if (declining > improving && declining > 0) return "declining";
  if (improving > declining && improving > 0) return "improving";
  return "stable";
}

export function computeClassAverageBySubject(grades: Grade[]): Record<string, number> {
  const bySubject = new Map<string, number[]>();

  for (const grade of grades) {
    const values = bySubject.get(grade.subject) ?? [];
    values.push(grade.score);
    bySubject.set(grade.subject, values);
  }

  const result: Record<string, number> = {};
  for (const [subject, scores] of bySubject.entries()) {
    result[subject] = averageScore(scores.map((score) => ({ score })));
  }

  return result;
}
