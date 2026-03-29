import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { average, riskScoreFromAverage } from "@/lib/admin-analytics";
import { prisma } from "@/lib/prisma";

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
    const limit = Math.max(1, Math.min(50, Number(limitRaw ?? "10") || 10));

    const students = await prisma.studentProfile.findMany({
      include: {
        user: { select: { name: true } },
        class: { select: { id: true, name: true } },
        grades: true,
      },
    });

    const atRisk = students
      .map((student) => {
        const avg = average(student.grades.map((grade) => grade.score));
        const bySubject = new Map<string, number[]>();
        for (const grade of student.grades) {
          const list = bySubject.get(grade.subject) ?? [];
          list.push(grade.score);
          bySubject.set(grade.subject, list);
        }
        const weakestSubject =
          [...bySubject.entries()]
            .map(([subject, scores]) => ({ subject, average: average(scores) }))
            .sort((a, b) => a.average - b.average)[0]?.subject ?? "";

        return {
          studentId: student.id,
          name: student.user.name,
          className: student.class.name,
          classId: student.class.id,
          averageScore: avg,
          riskScore: riskScoreFromAverage(avg),
          weakestSubject,
        };
      })
      .filter((student) => student.averageScore < 60)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);

    return NextResponse.json(atRisk);
  } catch (error) {
    console.error("GET /api/admin/at-risk failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
