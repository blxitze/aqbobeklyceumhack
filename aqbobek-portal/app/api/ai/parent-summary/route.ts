import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth";
import { computeKazakhGrade, computeTrend } from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";

type ParentSummaryRequest = {
  studentId?: string;
};

type WeeklyStats = {
  subjectSummary: Array<{
    subject: string;
    finalPercent: number | null;
    predictedGrade: 2 | 3 | 4 | 5 | null;
    gradeLabel: string;
    socPercent: number | null;
    trend: "improving" | "declining" | "stable";
  }>;
  missedLessons: number;
  worryingSubjects: string[];
  goodSubjects: string[];
};

function buildMockSummary(studentName: string, stats: WeeklyStats): string {
  const gradeSummary = stats.subjectSummary
    .map((entry) => `${entry.subject}: ${entry.gradeLabel}`)
    .join(", ");

  const warningPart =
    stats.worryingSubjects.length > 0
      ? `Рекомендуем обратить внимание на: ${stats.worryingSubjects.join(", ")}.`
      : "Успеваемость в норме по всем предметам.";

  return `За период обучения ${studentName} имеет следующие прогнозируемые оценки: ${gradeSummary || "недостаточно данных"}. ${warningPart}`;
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
          content: `Напиши недельную сводку об успеваемости ребёнка ${studentName} на основе данных (не изменяй числовые значения): ${JSON.stringify(
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

    const gradesLastWeek = await prisma.grade.findMany({
      where: {
        studentId,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: "asc" },
    });

    const allGrades = await prisma.grade.findMany({
      where: { studentId },
      orderBy: { date: "asc" },
    });

    const subjectsInLastWeek = new Set(gradesLastWeek.map((grade) => grade.subject));
    const bySubject = new Map<string, typeof allGrades>();
    for (const grade of allGrades) {
      if (!subjectsInLastWeek.has(grade.subject)) continue;
      const list = bySubject.get(grade.subject) ?? [];
      list.push(grade);
      bySubject.set(grade.subject, list);
    }

    const subjectResults = [...bySubject.entries()].map(([subject, subjectGrades]) => {
      const computed = computeKazakhGrade(subjectGrades);
      return {
        subject,
        finalPercent: computed.finalPercent,
        predictedGrade: computed.predictedGrade,
        gradeLabel: computed.gradeLabel,
        socPercent: computed.socPercent,
        trend: computeTrend(subjectGrades),
      };
    });

    const worryingSubjects = subjectResults
      .filter((subjectResult) => subjectResult.finalPercent !== null && subjectResult.finalPercent < 65)
      .map((subjectResult) => subjectResult.subject);
    const goodSubjects = subjectResults
      .filter((subjectResult) => subjectResult.finalPercent !== null && subjectResult.finalPercent >= 65)
      .map((subjectResult) => subjectResult.subject);

    const stats: WeeklyStats = {
      subjectSummary: subjectResults,
      missedLessons: gradesLastWeek.filter((grade) => !grade.attendance).length,
      worryingSubjects,
      goodSubjects,
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
