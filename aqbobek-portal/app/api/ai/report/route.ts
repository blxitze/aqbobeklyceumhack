import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attendanceRate, averageScore, computeClassAverageBySubject } from "@/lib/teacher-analytics";
import type { TeacherClassReportStats } from "@/components/teacher/types";

type ReportRequest = {
  classId?: string;
};

function buildMockReport(stats: TeacherClassReportStats): string {
  return `Отчёт по классу ${stats.className}: средний балл ${stats.classAverage.toFixed(
    1,
  )}. ${stats.atRiskCount} учеников в зоне риска. Рекомендуется обратить внимание на тему ${stats.mostMissedTopic}.`;
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
          content: `Сгенерируй отчёт об успеваемости класса на основе данных: ${JSON.stringify(
            stats,
          )}. Формат: 3 абзаца — общая картина, зона риска, рекомендации.`,
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
    const classAverageBySubject = computeClassAverageBySubject(allGrades);
    const classAverage = averageScore(allGrades.map((grade) => ({ score: grade.score })));

    const studentsWithAverage = classData.students.map((student) => ({
      id: student.id,
      name: student.user.name,
      average: averageScore(student.grades.map((grade) => ({ score: grade.score }))),
    }));

    const atRiskCount = studentsWithAverage.filter((student) => student.average < 60).length;
    const topStudents = studentsWithAverage
      .filter((student) => student.average > 85)
      .sort((a, b) => b.average - a.average)
      .slice(0, 5)
      .map((student) => ({
        id: student.id,
        name: student.name,
        averageScore: student.average,
      }));

    const missedTopicCount = new Map<string, number>();
    for (const grade of allGrades) {
      if (grade.score < 50) {
        missedTopicCount.set(grade.topic, (missedTopicCount.get(grade.topic) ?? 0) + 1);
      }
    }
    const mostMissedTopic =
      Array.from(missedTopicCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "нет данных";

    const stats: TeacherClassReportStats = {
      classId: classData.id,
      className: classData.name,
      classAverage,
      classAverageBySubject,
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
