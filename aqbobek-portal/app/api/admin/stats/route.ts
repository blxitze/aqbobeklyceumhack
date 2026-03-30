import { NextResponse } from "next/server";
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
      const studentSummaries = classItem.students.map((student) => {
        const gradesBySubject = new Map<string, typeof student.grades>();
        for (const grade of student.grades) {
          const values = gradesBySubject.get(grade.subject) ?? [];
          values.push(grade);
          gradesBySubject.set(grade.subject, values);
        }

        const subjectResults = [...gradesBySubject.entries()].map(([subject, subjectGrades]) => {
          const computed = computeKazakhGrade(subjectGrades);
          return {
            subject,
            finalPercent: computed.finalPercent,
            predictedGrade: computed.predictedGrade,
          };
        });

        const subjectPercents = subjectResults
          .map((result) => result.finalPercent)
          .filter((value): value is number => value !== null);
        const overallPercent = subjectPercents.length > 0 ? average(subjectPercents) : null;
        const overallPredictedGrade = overallPercent === null ? null : gradeFromPercent(overallPercent);

        return {
          studentId: student.id,
          studentName: student.user.name,
          className: classItem.name,
          overallPercent,
          overallPredictedGrade,
          subjectResults,
        };
      });

      const studentPercents = studentSummaries
        .map((summary) => summary.overallPercent)
        .filter((value): value is number => value !== null);
      const studentGrades = studentSummaries
        .map((summary) => summary.overallPredictedGrade)
        .filter((value): value is 2 | 3 | 4 | 5 => value !== null);

      const subjectMap = new Map<
        string,
        {
          percents: number[];
          grades: Array<2 | 3 | 4 | 5>;
        }
      >();
      for (const summary of studentSummaries) {
        for (const subjectResult of summary.subjectResults) {
          if (subjectResult.finalPercent === null || subjectResult.predictedGrade === null) continue;
          const bucket = subjectMap.get(subjectResult.subject) ?? { percents: [], grades: [] };
          bucket.percents.push(subjectResult.finalPercent);
          bucket.grades.push(subjectResult.predictedGrade);
          subjectMap.set(subjectResult.subject, bucket);
        }
      }

      const subjectBreakdown = [...subjectMap.entries()].map(([subject, bucket]) => ({
        subject,
        finalPercent: average(bucket.percents),
        predictedGrade: gradeFromPercent(average(bucket.percents)),
      }));

      const atRiskCount = studentSummaries.filter((summary) => {
        const hasCriticalSubject = summary.subjectResults.some(
          (subjectResult) => subjectResult.finalPercent !== null && subjectResult.finalPercent < 40,
        );
        return hasCriticalSubject || (summary.overallPercent !== null && summary.overallPercent < 50);
      }).length;

      return {
        className: classItem.name,
        studentCount: classItem.students.length,
        averagePercent: studentPercents.length > 0 ? average(studentPercents) : null,
        predictedGradeAvg: studentGrades.length > 0 ? average(studentGrades) : null,
        atRiskCount,
        gradeDistribution: {
          five: studentGrades.filter((grade) => grade === 5).length,
          four: studentGrades.filter((grade) => grade === 4).length,
          three: studentGrades.filter((grade) => grade === 3).length,
          two: studentGrades.filter((grade) => grade === 2).length,
        },
        subjectBreakdown,
      };
    });

    const schoolSubjectMap = new Map<
      string,
      {
        percents: number[];
        grades: Array<2 | 3 | 4 | 5>;
      }
    >();
    const subjectRiskMap = new Map<string, number>();
    const topStudentsPool: Array<{ name: string; className: string; averagePercent: number }> = [];
    const atRiskStudentsPool: Array<{
      name: string;
      className: string;
      averagePercent: number;
      weakestSubject: string;
    }> = [];

    for (const classItem of classes) {
      for (const student of classItem.students) {
        const gradesBySubject = new Map<string, typeof student.grades>();
        for (const grade of student.grades) {
          const values = gradesBySubject.get(grade.subject) ?? [];
          values.push(grade);
          gradesBySubject.set(grade.subject, values);
        }

        const subjectResults = [...gradesBySubject.entries()].map(([subject, subjectGrades]) => {
          const computed = computeKazakhGrade(subjectGrades);
          return {
            subject,
            finalPercent: computed.finalPercent,
            predictedGrade: computed.predictedGrade,
          };
        });

        const subjectPercents = subjectResults
          .map((result) => result.finalPercent)
          .filter((value): value is number => value !== null);
        const overallPercent = subjectPercents.length > 0 ? average(subjectPercents) : null;

        if (overallPercent !== null) {
          topStudentsPool.push({
            name: student.user.name,
            className: classItem.name,
            averagePercent: overallPercent,
          });
        }

        const weakestSubject = subjectResults
          .filter((result): result is { subject: string; finalPercent: number; predictedGrade: 2 | 3 | 4 | 5 | null } => result.finalPercent !== null)
          .sort((a, b) => a.finalPercent - b.finalPercent)[0];

        const hasCriticalSubject = subjectResults.some(
          (result) => result.finalPercent !== null && result.finalPercent < 40,
        );
        if (hasCriticalSubject || (overallPercent !== null && overallPercent < 50)) {
          atRiskStudentsPool.push({
            name: student.user.name,
            className: classItem.name,
            averagePercent: overallPercent ?? 0,
            weakestSubject: weakestSubject?.subject ?? "",
          });
        }

        for (const result of subjectResults) {
          if (result.finalPercent === null || result.predictedGrade === null) continue;

          const schoolBucket = schoolSubjectMap.get(result.subject) ?? { percents: [], grades: [] };
          schoolBucket.percents.push(result.finalPercent);
          schoolBucket.grades.push(result.predictedGrade);
          schoolSubjectMap.set(result.subject, schoolBucket);

          if (result.finalPercent < 40) {
            subjectRiskMap.set(result.subject, (subjectRiskMap.get(result.subject) ?? 0) + 1);
          }
        }
      }
    }

    const bySubject = [...schoolSubjectMap.entries()].map(([subject, bucket]) => ({
      subject,
      schoolPercent: average(bucket.percents),
      predictedGradeAvg: average(bucket.grades),
      atRiskCount: subjectRiskMap.get(subject) ?? 0,
    }));

    const topStudents = topStudentsPool.sort((a, b) => b.averagePercent - a.averagePercent).slice(0, 5);
    const atRiskStudents = atRiskStudentsPool
      .sort((a, b) => a.averagePercent - b.averagePercent)
      .slice(0, 10);

    return NextResponse.json({
      byClass,
      bySubject,
      topStudents,
      atRiskStudents,
    });
  } catch (error) {
    console.error("GET /api/admin/stats failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
