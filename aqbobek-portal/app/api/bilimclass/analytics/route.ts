import { NextRequest, NextResponse } from "next/server";
import type { Grade } from "@prisma/client";

import { auth } from "@/auth";
import {
  computeKazakhGrade,
  computeAttendanceRate,
  computeRiskScore,
  computeTrend,
} from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";

const BILIMCLASS_HEADERS = {
  "X-BilimClass-Version": "2.1.0",
  "X-BilimClass-School": "Aqbobek Lyceum",
};

function effectiveSubjectPercent(kazakh: {
  finalPercent: number | null;
  socPercent: number | null;
  sorPercent: number | null;
  foPercent: number | null;
}): number | null {
  return kazakh.finalPercent ?? kazakh.socPercent ?? kazakh.sorPercent ?? kazakh.foPercent;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: BILIMCLASS_HEADERS });
    }

    const studentId = request.nextUrl.searchParams.get("studentId")?.trim();
    if (!studentId) {
      return NextResponse.json(
        { error: "Missing required parameter: studentId" },
        { status: 400, headers: BILIMCLASS_HEADERS },
      );
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      select: { id: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404, headers: BILIMCLASS_HEADERS });
    }

    const grades = await prisma.grade.findMany({
      where: { studentId },
      orderBy: { date: "asc" },
    });

    const subjectMap = new Map<string, Grade[]>();
    for (const grade of grades) {
      const bySubject = subjectMap.get(grade.subject) ?? [];
      bySubject.push(grade);
      subjectMap.set(grade.subject, bySubject);
    }

    const subjectRisks = Array.from(subjectMap.entries()).map(([subject, subjectGrades]) => {
      const kazakh = computeKazakhGrade(subjectGrades);
      return {
        subject,
        foPercent: kazakh.foPercent,
        sorPercent: kazakh.sorPercent,
        socPercent: kazakh.socPercent,
        finalPercent: kazakh.finalPercent,
        predictedGrade: kazakh.predictedGrade,
        gradeLabel: kazakh.gradeLabel,
        trend: computeTrend(subjectGrades),
        missedTopics: Array.from(
          new Set(subjectGrades.filter((grade) => (grade.score / grade.maxScore) * 100 < 40).map((grade) => grade.topic)),
        ),
        riskScore: computeRiskScore(subjectGrades),
      };
    });

    const overallKazakh = computeKazakhGrade(grades);
    const strengths = subjectRisks
      .filter((subjectRisk) => {
        const p = effectiveSubjectPercent(subjectRisk);
        return p !== null && p >= 85;
      })
      .map((subjectRisk) => subjectRisk.subject);
    const weaknesses = subjectRisks
      .filter((subjectRisk) => {
        const p = effectiveSubjectPercent(subjectRisk);
        return p !== null && p < 65;
      })
      .map((subjectRisk) => subjectRisk.subject);
    const attendanceRate = computeAttendanceRate(grades);

    const riskLevel: "low" | "medium" | "high" =
      (overallKazakh.finalPercent !== null && overallKazakh.finalPercent < 40) ||
      (overallKazakh.socPercent !== null && overallKazakh.socPercent < 40)
        ? "high"
        : overallKazakh.finalPercent !== null && overallKazakh.finalPercent < 65
          ? "medium"
          : overallKazakh.finalPercent === null
            ? "medium"
            : "low";

    return NextResponse.json(
      {
        studentId,
        riskLevel,
        foPercent: overallKazakh.foPercent,
        sorPercent: overallKazakh.sorPercent,
        socPercent: overallKazakh.socPercent,
        finalPercent: overallKazakh.finalPercent,
        predictedGrade: overallKazakh.predictedGrade,
        subjectRisks,
        strengths,
        weaknesses,
        attendanceWarning: attendanceRate < 80,
      },
      { headers: BILIMCLASS_HEADERS },
    );
  } catch (error) {
    console.error("GET /api/bilimclass/analytics failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: BILIMCLASS_HEADERS },
    );
  }
}
