import { NextResponse } from "next/server";
import type { Grade } from "@prisma/client";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeKazakhGrade } from "@/lib/bilimclass";
import { attendanceRate } from "@/lib/teacher-analytics";
import type { TeacherClassReportStats } from "@/components/teacher/types";

type ReportRequest = {
  classId?: string;
};

function buildMockReport(stats: TeacherClassReportStats): string {
  const finalLabel =
    stats.classFinalPercent === null ? "—" : `${stats.classFinalPercent.toFixed(1)}%`;
  return `Отчёт по классу ${stats.className}: итоговый процент ${finalLabel}. ${stats.atRiskCount} учеников в зоне риска. Рекомендуется обратить внимание на тему ${stats.mostMissedTopic}.`;
}

async function generateOpenAiReport(stats: TeacherClassReportStats): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildMockReport(stats);
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Ты помощник классного руководителя казахстанской школы. Пиши кратко, по-русски, профессионально.",
        },
        {
          role: "user",
          content: `Сгенерируй отчёт об успеваемости класса на основе данных: ${JSON.stringify(stats)}.
Итоговый % = ФО(25%) + СОР(25%) + СОЧ(50%).
Особое внимание обрати на результаты СОЧ (суммативное оценивание за четверть) — они имеют наибольший вес.
Не изменяй числовые значения из JSON.
Формат: 3 абзаца — общая картина, зона риска, рекомендации.`,
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error("Не удалось сгенерировать отчёт через OpenAI");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() || buildMockReport(stats);
}

function computeKazakhBySubject(grades: Grade[]): TeacherClassReportStats["classBySubject"] {
  const bySubject = new Map<string, Grade[]>();
  for (const grade of grades) {
    const values = bySubject.get(grade.subject) ?? [];
    values.push(grade);
    bySubject.set(grade.subject, values);
  }

  const result: TeacherClassReportStats["classBySubject"] = {};
  for (const [subject, values] of bySubject.entries()) {
    const metrics = computeKazakhGrade(values);
    result[subject] = {
      foPercent: metrics.foPercent,
      sorPercent: metrics.sorPercent,
      socPercent: metrics.socPercent,
      finalPercent: metrics.finalPercent,
      predictedGrade: metrics.predictedGrade,
    };
  }

  return result;
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth("TEACHER");
    const body = (await request.json()) as ReportRequest;
    const classId = body.classId?.trim();

    if (!classId) {
      return NextResponse.json({ error: "classId обязателен" }, { status: 400 });
    }

    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { userId: session.user.id },
      include: { scheduleSlots: true },
    });

    if (!teacherProfile) {
      return NextResponse.json({ error: "Профиль учителя не найден" }, { status: 404 });
    }

    const teachesClass = teacherProfile.scheduleSlots.some((slot) => slot.classId === classId);
    if (!teachesClass) {
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

    const allGrades = classData.students.flatMap((student) => student.grades);
    const classBySubject = computeKazakhBySubject(allGrades);
    const classFinalPercent = computeKazakhGrade(allGrades).finalPercent;

    const studentsWithPercent = classData.students.map((student) => {
      const metrics = computeKazakhGrade(student.grades);
      return {
        id: student.id,
        name: student.user.name,
        finalPercent: metrics.finalPercent,
        predictedGrade: metrics.predictedGrade,
      };
    });

    const atRiskCount = studentsWithPercent.filter(
      (student) => student.finalPercent !== null && student.finalPercent < 40,
    ).length;
    const topStudents = studentsWithPercent
      .filter((student) => student.finalPercent !== null)
      .sort((a, b) => (b.finalPercent ?? 0) - (a.finalPercent ?? 0))
      .slice(0, 5)
      .map((student) => ({
        id: student.id,
        name: student.name,
        finalPercent: student.finalPercent,
        predictedGrade: student.predictedGrade,
      }));

    const missedTopicCount = new Map<string, number>();
    for (const grade of allGrades) {
      if ((grade.score / grade.maxScore) * 100 < 40) {
        missedTopicCount.set(grade.topic, (missedTopicCount.get(grade.topic) ?? 0) + 1);
      }
    }
    const mostMissedTopic =
      Array.from(missedTopicCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "нет данных";

    const stats: TeacherClassReportStats = {
      classId: classData.id,
      className: classData.name,
      classFinalPercent,
      classBySubject,
      atRiskCount,
      topStudents,
      mostMissedTopic,
      attendanceRate: attendanceRate(allGrades.map((grade) => ({ attendance: grade.attendance }))),
    };

    let report = "";
    try {
      report = await generateOpenAiReport(stats);
    } catch {
      report = buildMockReport(stats);
    }

    return NextResponse.json({ report, stats });
  } catch (error) {
    console.error("POST /api/ai/report failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
