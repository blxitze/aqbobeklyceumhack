import { NextRequest, NextResponse } from "next/server";
import type { Grade } from "@prisma/client";

import { auth } from "@/auth";
import {
  computeAttendanceRate,
  computeRiskScore,
  computeTrend,
} from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";

const BILIMCLASS_HEADERS = {
  "X-BilimClass-Version": "2.1.0",
  "X-BilimClass-School": "Aqbobek Lyceum",
};

function averageScore(grades: Grade[]): number {
  if (grades.length === 0) return 0;
  const avg = grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length;
  return Number(avg.toFixed(1));
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

    const subjectRisks = Array.from(subjectMap.entries()).map(([subject, subjectGrades]) => ({
      subject,
      averageScore: averageScore(subjectGrades),
      trend: computeTrend(subjectGrades),
      missedTopics: Array.from(
        new Set(subjectGrades.filter((grade) => grade.score < 50).map((grade) => grade.topic)),
      ),
      riskScore: computeRiskScore(subjectGrades),
    }));

    const overallAverage = averageScore(grades);
    const strengths = subjectRisks
      .filter((subjectRisk) => subjectRisk.averageScore > 80)
      .map((subjectRisk) => subjectRisk.subject);
    const weaknesses = subjectRisks
      .filter((subjectRisk) => subjectRisk.averageScore < 60)
      .map((subjectRisk) => subjectRisk.subject);
    const attendanceRate = computeAttendanceRate(grades);

    const riskLevel: "low" | "medium" | "high" =
      overallAverage < 55 ? "high" : overallAverage < 70 ? "medium" : "low";

    return NextResponse.json(
      {
        studentId,
        riskLevel,
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
