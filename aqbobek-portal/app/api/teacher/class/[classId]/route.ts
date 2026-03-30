import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { computeKazakhGrade } from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";
import {
  attendanceRate,
  computeClassFinalPercentBySubject,
  isStudentAtRiskByKazakh,
} from "@/lib/teacher-analytics";

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

    const students = classData.students.map((student) => {
      const kz = computeKazakhGrade(student.grades);
      return {
        id: student.id,
        name: student.user.name,
        finalPercent: kz.finalPercent,
        predictedGrade: kz.predictedGrade,
        attendanceRate: attendanceRate(student.grades.map((grade) => ({ attendance: grade.attendance }))),
      };
    });

    const allGrades = classData.students.flatMap((student) => student.grades);
    const finalPercentBySubject = computeClassFinalPercentBySubject(allGrades);

    const topStudents = [...students]
      .filter((student) => student.finalPercent !== null)
      .sort((a, b) => (b.finalPercent ?? 0) - (a.finalPercent ?? 0))
      .slice(0, 3);

    const atRiskStudents = students.filter((student) => {
      const full = classData.students.find((s) => s.id === student.id);
      return full ? isStudentAtRiskByKazakh(full.grades) : false;
    });

    return NextResponse.json({
      class: {
        id: classData.id,
        name: classData.name,
        grade: classData.grade,
      },
      students,
      finalPercentBySubject,
      topStudents,
      atRiskStudents,
    });
  } catch (error) {
    console.error("GET /api/teacher/class/[classId] failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
