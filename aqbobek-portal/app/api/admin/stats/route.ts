import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { average } from "@/lib/admin-analytics";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const classes = await prisma.class.findMany({
      include: {
        students: {
          include: {
            user: { select: { name: true } },
            grades: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const byClass = classes.map((classItem) => {
      const classGrades = classItem.students.flatMap((student) => student.grades);
      const studentAverages = classItem.students.map((student) => average(student.grades.map((g) => g.score)));
      return {
        className: classItem.name,
        studentCount: classItem.students.length,
        averageScore: average(classGrades.map((grade) => grade.score)),
        atRiskCount: studentAverages.filter((studentAvg) => studentAvg < 60).length,
      };
    });

    const subjectMap = new Map<string, number[]>();
    const subjectRiskMap = new Map<string, number>();
    const topStudentsPool: Array<{ name: string; className: string; averageScore: number }> = [];
    const atRiskStudentsPool: Array<{
      name: string;
      className: string;
      averageScore: number;
      weakestSubject: string;
    }> = [];
    const classStats = classes.map((classItem) => {
      const averageBySubject: Record<string, number> = {};
      const bySubjectInClass = new Map<string, number[]>();

      for (const student of classItem.students) {
        const studentAvg = average(student.grades.map((grade) => grade.score));
        topStudentsPool.push({
          name: student.user.name,
          className: classItem.name,
          averageScore: studentAvg,
        });

        const studentSubjectMap = new Map<string, number[]>();
        for (const grade of student.grades) {
          const schoolList = subjectMap.get(grade.subject) ?? [];
          schoolList.push(grade.score);
          subjectMap.set(grade.subject, schoolList);

          const classList = bySubjectInClass.get(grade.subject) ?? [];
          classList.push(grade.score);
          bySubjectInClass.set(grade.subject, classList);

          const studentSubjectList = studentSubjectMap.get(grade.subject) ?? [];
          studentSubjectList.push(grade.score);
          studentSubjectMap.set(grade.subject, studentSubjectList);
        }

        const weakestSubject =
          [...studentSubjectMap.entries()]
            .map(([subject, scores]) => ({ subject, avg: average(scores) }))
            .sort((a, b) => a.avg - b.avg)[0]?.subject ?? "";

        if (studentAvg < 60) {
          atRiskStudentsPool.push({
            name: student.user.name,
            className: classItem.name,
            averageScore: studentAvg,
            weakestSubject,
          });
        }

        for (const [subject, scores] of studentSubjectMap.entries()) {
          const avg = average(scores);
          if (avg < 60) {
            subjectRiskMap.set(subject, (subjectRiskMap.get(subject) ?? 0) + 1);
          }
        }
      }

      for (const [subject, scores] of bySubjectInClass.entries()) {
        averageBySubject[subject] = average(scores);
      }

      return {
        className: classItem.name,
        averageBySubject,
      };
    });

    const bySubject = [...subjectMap.entries()].map(([subject, scores]) => ({
      subject,
      schoolAverage: average(scores),
      atRiskCount: subjectRiskMap.get(subject) ?? 0,
    }));

    const topStudents = topStudentsPool.sort((a, b) => b.averageScore - a.averageScore).slice(0, 5);
    const atRiskStudents = atRiskStudentsPool
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 10);

    return NextResponse.json({
      byClass,
      bySubject,
      topStudents,
      atRiskStudents,
      classStats,
    });
  } catch (error) {
    console.error("GET /api/admin/stats failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
