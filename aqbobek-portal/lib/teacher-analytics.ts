import type { Grade } from "@prisma/client";

import type { SubjectTrend } from "@/components/teacher/types";
import { computeKazakhGrade } from "@/lib/bilimclass";

export function attendanceRate(grades: Array<{ attendance: boolean }>): number {
  if (grades.length === 0) return 0;
  const attended = grades.filter((grade) => grade.attendance).length;
  return Number(((attended / grades.length) * 100).toFixed(1));
}

export function trendFromSubjectAverages(
  subjectAverages: Array<{ trend: SubjectTrend }>,
): SubjectTrend {
  const declining = subjectAverages.filter((item) => item.trend === "declining").length;
  const improving = subjectAverages.filter((item) => item.trend === "improving").length;

  if (declining > improving && declining > 0) return "declining";
  if (improving > declining && improving > 0) return "improving";
  return "stable";
}

/** Per-subject finalPercent from Kazakh formula (null if FO/SOR/SOC incomplete). */
export function computeClassFinalPercentBySubject(grades: Grade[]): Record<string, number | null> {
  const bySubject = new Map<string, Grade[]>();

  for (const grade of grades) {
    const values = bySubject.get(grade.subject) ?? [];
    values.push(grade);
    bySubject.set(grade.subject, values);
  }

  const result: Record<string, number | null> = {};
  for (const [subject, subjectGrades] of bySubject.entries()) {
    result[subject] = computeKazakhGrade(subjectGrades).finalPercent;
  }

  return result;
}

export function isStudentAtRiskByKazakh(grades: Grade[]): boolean {
  if (grades.length === 0) return false;
  const overall = computeKazakhGrade(grades);
  if (overall.finalPercent !== null && overall.finalPercent < 50) return true;

  const bySubject = new Map<string, Grade[]>();
  for (const grade of grades) {
    const list = bySubject.get(grade.subject) ?? [];
    list.push(grade);
    bySubject.set(grade.subject, list);
  }
  for (const subjectGrades of bySubject.values()) {
    const kz = computeKazakhGrade(subjectGrades);
    if (kz.finalPercent !== null && kz.finalPercent < 40) return true;
  }
  return false;
}
