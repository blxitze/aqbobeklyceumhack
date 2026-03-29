import type { Grade } from "@prisma/client";

export type GradeTrend = "improving" | "declining" | "stable";

export function computeTrend(grades: Grade[]): GradeTrend {
  if (grades.length < 6) {
    return "stable";
  }

  const recentSix = [...grades]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-6);

  const firstThree = recentSix.slice(0, 3);
  const lastThree = recentSix.slice(3, 6);

  const firstAverage =
    firstThree.reduce((sum, grade) => sum + grade.score, 0) / firstThree.length;
  const lastAverage =
    lastThree.reduce((sum, grade) => sum + grade.score, 0) / lastThree.length;

  const difference = lastAverage - firstAverage;

  if (difference > 5) {
    return "improving";
  }

  if (difference < -5) {
    return "declining";
  }

  return "stable";
}

export function computeLetterGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export function computeRiskScore(grades: Grade[]): number {
  if (grades.length === 0) {
    return 0;
  }

  const averageScore =
    grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length;
  const missedTopicsCount = grades.filter((grade) => grade.score < 50).length;
  const rawScore = (100 - averageScore) * 0.7 + missedTopicsCount * 5;

  return Math.max(0, Math.min(100, Number(rawScore.toFixed(1))));
}

export function computeAttendanceRate(grades: Grade[]): number {
  if (grades.length === 0) {
    return 0;
  }

  const attended = grades.filter((grade) => grade.attendance).length;
  const rate = (attended / grades.length) * 100;

  return Number(rate.toFixed(1));
}
