import { NextRequest, NextResponse } from "next/server";
import type { Grade } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { computeAttendanceRate, computeTrend } from "@/lib/bilimclass";

const BILIMCLASS_HEADERS = {
  "X-BilimClass-Version": "2.1.0",
  "X-BilimClass-School": "Aqbobek Lyceum",
};

function averageScore(grades: Grade[]): number {
  if (grades.length === 0) return 0;
  const average = grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length;
  return Number(average.toFixed(1));
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: BILIMCLASS_HEADERS });
    }

    const classId = request.nextUrl.searchParams.get("classId")?.trim();
    const search = request.nextUrl.searchParams.get("search")?.trim();

    const students = await prisma.studentProfile.findMany({
      where: {
        ...(classId ? { classId } : {}),
        ...(search
          ? {
              user: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        class: {
          select: {
            name: true,
          },
        },
        grades: true,
      },
      orderBy: {
        user: {
          name: "asc",
        },
      },
    });

    const payload = students.map((student) => {
      const subjectMap = new Map<string, Grade[]>();
      for (const grade of student.grades) {
        const bySubject = subjectMap.get(grade.subject) ?? [];
        bySubject.push(grade);
        subjectMap.set(grade.subject, bySubject);
      }

      const subjectAverages = Array.from(subjectMap.entries()).map(([subject, grades]) => ({
        subject,
        average: averageScore(grades),
        trend: computeTrend(grades),
      }));

      return {
        id: student.id,
        name: student.user.name,
        classId: student.classId,
        className: student.class.name,
        averageScore: averageScore(student.grades),
        attendanceRate: computeAttendanceRate(student.grades),
        subjectAverages,
      };
    });

    return NextResponse.json(payload, { headers: BILIMCLASS_HEADERS });
  } catch (error) {
    console.error("GET /api/bilimclass/students failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: BILIMCLASS_HEADERS },
    );
  }
}
