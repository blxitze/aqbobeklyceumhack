import type { Grade } from "@prisma/client";

export type GradeTrend = "improving" | "declining" | "stable";
export type KazakhGradeLabel = "Отлично" | "Хорошо" | "Удовл." | "Неудовл." | "—";

type GradeWithMax = Pick<Grade, "score" | "maxScore" | "type">;

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

export function gradeTypeLabel(type: Grade["type"]): "СОЧ" | "СОР" | "ФО" {
  if (type === "SOC") return "СОЧ";
  if (type === "SOR") return "СОР";
  return "ФО";
}

function percentFromGrades(grades: GradeWithMax[]): number | null {
  if (grades.length === 0) return null;

  const numerator = grades.reduce((sum, grade) => sum + grade.score, 0);
  const denominator = grades.reduce((sum, grade) => sum + grade.maxScore, 0);
  if (denominator <= 0) return null;

  return (numerator / denominator) * 100;
}

function roundNullable(value: number | null): number | null {
  if (value === null) return null;
  return Math.round(value * 10) / 10;
}

export function computeKazakhGrade(grades: GradeWithMax[]): {
  foPercent: number | null;
  sorPercent: number | null;
  socPercent: number | null;
  finalPercent: number | null;
  predictedGrade: 2 | 3 | 4 | 5 | null;
  gradeLabel: KazakhGradeLabel;
} {
  const foGrades = grades.filter((grade) => grade.type === "CURRENT");
  const sorGrades = grades.filter((grade) => grade.type === "SOR");
  const socGrades = grades.filter((grade) => grade.type === "SOC");

  const foPercent = percentFromGrades(foGrades);
  const sorPercent = percentFromGrades(sorGrades);
  const socPercent = percentFromGrades(socGrades);

  const finalPercent =
    foPercent !== null && sorPercent !== null && socPercent !== null
      ? foPercent * 0.25 + sorPercent * 0.25 + socPercent * 0.5
      : null;

  const predictedGrade: 2 | 3 | 4 | 5 | null =
    finalPercent === null
      ? null
      : finalPercent >= 85
        ? 5
        : finalPercent >= 65
          ? 4
          : finalPercent >= 40
            ? 3
            : 2;

  const gradeLabel: KazakhGradeLabel =
    predictedGrade === null
      ? "—"
      : predictedGrade === 5
        ? "Отлично"
        : predictedGrade === 4
          ? "Хорошо"
          : predictedGrade === 3
            ? "Удовл."
            : "Неудовл.";

  return {
    foPercent: roundNullable(foPercent),
    sorPercent: roundNullable(sorPercent),
    socPercent: roundNullable(socPercent),
    finalPercent: roundNullable(finalPercent),
    predictedGrade,
    gradeLabel,
  };
}

export function computeRiskScore(grades: Grade[]): number {
  if (grades.length === 0) {
    return 0;
  }

  const kazakh = computeKazakhGrade(grades);
  let riskScore = kazakh.finalPercent === null ? 70 : 100 - kazakh.finalPercent;

  if (kazakh.socPercent !== null && kazakh.socPercent < 40) {
    riskScore += 25;
  }
  if (kazakh.sorPercent !== null && kazakh.sorPercent < 40) {
    riskScore += 10;
  }

  return Math.max(0, Math.min(100, Number(riskScore.toFixed(1))));
}

export function computeAttendanceRate(grades: Grade[]): number {
  if (grades.length === 0) {
    return 0;
  }

  const attended = grades.filter((grade) => grade.attendance).length;
  const rate = (attended / grades.length) * 100;

  return Number(rate.toFixed(1));
}
