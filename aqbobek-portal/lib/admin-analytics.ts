import type { Grade } from "@prisma/client";

export function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
}

export function attendanceRate(grades: Grade[]): number {
  if (grades.length === 0) return 0;
  const attended = grades.filter((grade) => grade.attendance).length;
  return Number(((attended / grades.length) * 100).toFixed(1));
}

export function riskScoreFromAverage(avg: number): number {
  return Number(Math.max(0, Math.min(100, 100 - avg)).toFixed(1));
}
