import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  computeAttendanceRate,
  computeKazakhGrade,
  gradeTypeLabel,
} from "@/lib/bilimclass";

const BILIMCLASS_HEADERS = {
  "X-BilimClass-Version": "2.1.0",
  "X-BilimClass-School": "Aqbobek Lyceum",
};

function toDate(value: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
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

    const subject = request.nextUrl.searchParams.get("subject")?.trim();
    const from = toDate(request.nextUrl.searchParams.get("from"));
    const to = toDate(request.nextUrl.searchParams.get("to"));

    if (request.nextUrl.searchParams.get("from") && !from) {
      return NextResponse.json(
        { error: "Missing required parameter: from" },
        { status: 400, headers: BILIMCLASS_HEADERS },
      );
    }

    if (request.nextUrl.searchParams.get("to") && !to) {
      return NextResponse.json(
        { error: "Missing required parameter: to" },
        { status: 400, headers: BILIMCLASS_HEADERS },
      );
    }

    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404, headers: BILIMCLASS_HEADERS });
    }

    const where: Prisma.GradeWhereInput = {
      studentId,
      ...(subject ? { subject } : {}),
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
    };

    const grades = await prisma.grade.findMany({
      where,
      orderBy: { date: "desc" },
    });

    const gradesPayload = grades.map((grade) => ({
      id: grade.id,
      subject: grade.subject,
      topic: grade.topic,
      score: grade.score,
      type: grade.type,
      typeLabel: gradeTypeLabel(grade.type),
      maxScore: grade.maxScore,
      percent: Number(((grade.score / grade.maxScore) * 100).toFixed(1)),
      percentage: Number(((grade.score / grade.maxScore) * 100).toFixed(1)),
      date: grade.date.toISOString(),
      attendance: grade.attendance,
    }));

    const perSubject = new Map<string, typeof grades>();
    for (const grade of grades) {
      const values = perSubject.get(grade.subject) ?? [];
      values.push(grade);
      perSubject.set(grade.subject, values);
    }

    let bestSubject = "";
    let weakestSubject = "";
    let bestAverage = -1;
    let weakestAverage = Number.POSITIVE_INFINITY;

    for (const [subjectName, subjectGrades] of perSubject.entries()) {
      const subjectKz = computeKazakhGrade(subjectGrades);
      const subjectPercent =
        subjectKz.finalPercent ??
        subjectKz.socPercent ??
        subjectKz.sorPercent ??
        subjectKz.foPercent ??
        0;

      if (subjectPercent > bestAverage) {
        bestAverage = subjectPercent;
        bestSubject = subjectName;
      }
      if (subjectPercent < weakestAverage) {
        weakestAverage = subjectPercent;
        weakestSubject = subjectName;
      }
    }

    const kazakhSummary = computeKazakhGrade(grades);
    const summary = {
      totalGrades: grades.length,
      attendanceRate: computeAttendanceRate(grades),
      bestSubject,
      weakestSubject,
      foPercent: kazakhSummary.foPercent,
      sorPercent: kazakhSummary.sorPercent,
      socPercent: kazakhSummary.socPercent,
      finalPercent: kazakhSummary.finalPercent,
      predictedGrade: kazakhSummary.predictedGrade,
      gradeLabel: kazakhSummary.gradeLabel,
    };

    return NextResponse.json(
      {
        studentId,
        studentName: student.user.name,
        grades: gradesPayload,
        socGrades: gradesPayload.filter((grade) => grade.type === "SOC"),
        sorGrades: gradesPayload.filter((grade) => grade.type === "SOR"),
        summary,
      },
      { headers: BILIMCLASS_HEADERS },
    );
  } catch (error) {
    console.error("GET /api/bilimclass/grades failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: BILIMCLASS_HEADERS },
    );
  }
}
