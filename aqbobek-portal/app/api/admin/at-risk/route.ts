import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { computeKazakhGrade } from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function gradeFromPercent(percent: number): 2 | 3 | 4 | 5 {
  if (percent >= 85) return 5;
  if (percent >= 65) return 4;
  if (percent >= 40) return 3;
  return 2;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = Math.max(1, Math.min(20, Number(limitRaw ?? "10") || 10));

    const students = await prisma.studentProfile.findMany({
      include: {
        user: { select: { name: true } },
        class: { select: { id: true, name: true } },
        grades: true,
      },
    });

    const atRisk = students
      .map((student) => {
        const bySubject = new Map<string, typeof student.grades>();
        for (const grade of student.grades) {
          const list = bySubject.get(grade.subject) ?? [];
          list.push(grade);
          bySubject.set(grade.subject, list);
        }

        const subjectResults = [...bySubject.entries()].map(([subject, subjectGrades]) => {
          const computed = computeKazakhGrade(subjectGrades);
          return {
            subject,
            finalPercent: computed.finalPercent,
            predictedGrade: computed.predictedGrade,
            gradeLabel: computed.gradeLabel,
          };
        });

        const validPercents = subjectResults
          .map((result) => result.finalPercent)
          .filter((percent): percent is number => percent !== null);
        const overallFinalPercent = validPercents.length > 0 ? average(validPercents) : null;
        const overallPredictedGrade = overallFinalPercent === null ? null : gradeFromPercent(overallFinalPercent);

        const worstSubject = subjectResults
          .filter((result) => result.finalPercent !== null)
          .sort((a, b) => (a.finalPercent ?? 0) - (b.finalPercent ?? 0))[0];

        const hasCriticalSubject = subjectResults.some(
          (result) => result.finalPercent !== null && result.finalPercent < 40,
        );

        return {
          studentId: student.id,
          name: student.user.name,
          className: student.class.name,
          classId: student.class.id,
          finalPercent: overallFinalPercent,
          predictedGrade: overallPredictedGrade,
          worstSubject: worstSubject?.subject ?? "—",
          worstSubjectPercent: worstSubject?.finalPercent ?? null,
          hasCriticalSubject,
        };
      })
      .filter(
        (student) =>
          student.finalPercent !== null && (student.hasCriticalSubject || student.finalPercent < 50),
      )
      .sort((a, b) => (a.finalPercent ?? 0) - (b.finalPercent ?? 0))
      .slice(0, limit);

    return NextResponse.json(atRisk);
  } catch (error) {
    console.error("GET /api/admin/at-risk failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
