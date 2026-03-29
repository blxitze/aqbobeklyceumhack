import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { computeTrend } from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";

type ParentSummaryRequest = {
  studentId?: string;
};

type WeeklyStats = {
  weeklyAverageBySubject: Record<string, number>;
  missedLessons: number;
  improvedSubjects: string[];
  worryingSubjects: string[];
};

function average(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1));
}

function buildMockSummary(studentName: string, stats: WeeklyStats): string {
  const overallAverage = average(Object.values(stats.weeklyAverageBySubject));
  const mainSubject = stats.worryingSubjects[0] ?? "ключевые темы";
  return `За прошедшую неделю ${studentName} показал(а) средний балл ${overallAverage.toFixed(
    1,
  )}. Обратите внимание на ${mainSubject}. Рекомендуем обсудить расписание подготовки.`;
}

async function generateWithOpenAi(studentName: string, stats: WeeklyStats): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildMockSummary(studentName, stats);
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
            "Ты помощник для родителей учеников казахстанской школы. Пиши тепло, по-русски, кратко — как будто пишешь родителю письмо.",
        },
        {
          role: "user",
          content: `Напиши недельную сводку об успеваемости ребёнка ${studentName} на основе данных: ${JSON.stringify(
            stats,
          )}. Формат: 2-3 предложения — что хорошо, что требует внимания, один конкретный совет родителю.`,
        },
      ],
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() || buildMockSummary(studentName, stats);
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth("PARENT");
    const body = (await request.json()) as ParentSummaryRequest;
    const studentId = body.studentId?.trim();

    if (!studentId) {
      return NextResponse.json({ error: "studentId обязателен" }, { status: 400 });
    }

    const parentProfile = await prisma.parentProfile.findFirst({
      where: { userId: session.user.id },
      include: {
        child: {
          include: { user: true },
        },
      },
    });

    if (!parentProfile) {
      return NextResponse.json({ error: "Профиль родителя не найден" }, { status: 404 });
    }

    if (parentProfile.childId !== studentId) {
      return NextResponse.json({ error: "Доступ запрещён" }, { status: 403 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const grades = await prisma.grade.findMany({
      where: {
        studentId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    const bySubject = new Map<string, typeof grades>();
    for (const grade of grades) {
      const list = bySubject.get(grade.subject) ?? [];
      list.push(grade);
      bySubject.set(grade.subject, list);
    }

    const weeklyAverageBySubject: Record<string, number> = {};
    const improvedSubjects: string[] = [];
    const worryingSubjects: string[] = [];

    for (const [subject, subjectGrades] of bySubject.entries()) {
      weeklyAverageBySubject[subject] = average(subjectGrades.map((grade) => grade.score));
      const trend = computeTrend(subjectGrades);
      if (trend === "improving") improvedSubjects.push(subject);
      if (trend === "declining" || weeklyAverageBySubject[subject] < 60) {
        worryingSubjects.push(subject);
      }
    }

    const stats: WeeklyStats = {
      weeklyAverageBySubject,
      missedLessons: grades.filter((grade) => !grade.attendance).length,
      improvedSubjects,
      worryingSubjects,
    };

    let summary = "";
    try {
      summary = await generateWithOpenAi(parentProfile.child.user.name, stats);
    } catch {
      summary = buildMockSummary(parentProfile.child.user.name, stats);
    }

    return NextResponse.json({
      summary,
      stats,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /api/ai/parent-summary failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
