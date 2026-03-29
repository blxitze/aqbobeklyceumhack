import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const BILIMCLASS_HEADERS = {
  "X-BilimClass-Version": "2.1.0",
  "X-BilimClass-School": "Aqbobek Lyceum",
};

export async function GET() {
  try {
    const [students, grades, topics, classes, sampleStudent] = await Promise.all([
      prisma.studentProfile.count(),
      prisma.grade.count(),
      prisma.topic.count(),
      prisma.class.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.studentProfile.findFirst({
        include: {
          user: { select: { name: true } },
          class: { select: { name: true } },
          _count: { select: { grades: true } },
        },
        orderBy: { id: "asc" },
      }),
    ]);

    return NextResponse.json(
      {
        students,
        grades,
        topics,
        classes: classes.map((classItem) => classItem.name),
        sampleStudent: sampleStudent
          ? {
              name: sampleStudent.user.name,
              className: sampleStudent.class.name,
              gradeCount: sampleStudent._count.grades,
            }
          : {
              name: "",
              className: "",
              gradeCount: 0,
            },
      },
      { headers: BILIMCLASS_HEADERS },
    );
  } catch (error) {
    console.error("GET /api/bilimclass/seed-check failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: BILIMCLASS_HEADERS },
    );
  }
}
