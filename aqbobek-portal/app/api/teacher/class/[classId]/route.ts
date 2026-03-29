import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attendanceRate, averageScore, computeClassAverageBySubject } from "@/lib/teacher-analytics";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ classId: string }> },
) {
  try {
    const session = await requireAuth("TEACHER");
    const { classId } = await params;

    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: session.user.id },
      include: { scheduleSlots: true },
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: "Профиль учителя не найден" }, { status: 404 });
    }

    const hasAccess = teacherProfile.scheduleSlots.some((slot) => slot.classId === classId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Доступ к классу запрещён" }, { status: 403 });
    }

    const classData = await prisma.class.findUnique({
      where: { id: classId },
      include: {
        students: {
          include: {
            user: { select: { name: true } },
            grades: true,
          },
        },
      },
    });

    if (!classData) {
      return NextResponse.json({ error: "Класс не найден" }, { status: 404 });
    }

    const students = classData.students.map((student) => ({
      id: student.id,
      name: student.user.name,
      averageScore: averageScore(student.grades.map((grade) => ({ score: grade.score }))),
      attendanceRate: attendanceRate(student.grades.map((grade) => ({ attendance: grade.attendance }))),
    }));

    const allGrades = classData.students.flatMap((student) => student.grades);
    const averageBySubject = computeClassAverageBySubject(allGrades);
    const topStudents = [...students].sort((a, b) => b.averageScore - a.averageScore).slice(0, 3);
    const atRiskStudents = students.filter((student) => student.averageScore < 60);

    return NextResponse.json({
      class: {
        id: classData.id,
        name: classData.name,
        grade: classData.grade,
      },
      students,
      averageBySubject,
      topStudents,
      atRiskStudents,
    });
  } catch (error) {
    console.error("GET /api/teacher/class/[classId] failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
