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
  bestSubject: string | null;
  worstSubject: string | null;
};

/** Structured facts passed to the LLM — no raw grade rows. */
type ParentSummaryLlmContext = {
  childName: string;
  subjectResults: Array<{
    subject: string;
    finalPercent: number | null;
    predictedGrade: 2 | 3 | 4 | 5 | null;
    gradeLabel: string;
    socPercent: number | null;
    trend: "improving" | "declining" | "stable";
  }>;
  missedLessons: number;
  bestSubject: string | null;
  worstSubject: string | null;
  worryingSubjects: string[];
  goodSubjects: string[];
};

function bestAndWorstSubject(
  subjectResults: Array<{ subject: string; finalPercent: number | null }>,
): { bestSubject: string | null; worstSubject: string | null } {
  const scored = subjectResults.filter(
    (s): s is { subject: string; finalPercent: number } => s.finalPercent !== null,
  );
  if (scored.length === 0) {
    return { bestSubject: null, worstSubject: null };
  }
  let best = scored[0]!;
  let worst = scored[0]!;
  for (const row of scored) {
    if (row.finalPercent > best.finalPercent) best = row;
    if (row.finalPercent < worst.finalPercent) worst = row;
  }
  return { bestSubject: best.subject, worstSubject: worst.subject };
}

function buildLlmContext(childName: string, stats: WeeklyStats): ParentSummaryLlmContext {
  return {
    childName,
    subjectResults: stats.subjectSummary.map((s) => ({
      subject: s.subject,
      finalPercent: s.finalPercent,
      predictedGrade: s.predictedGrade,
      gradeLabel: s.gradeLabel,
      socPercent: s.socPercent,
      trend: s.trend,
    })),
    missedLessons: stats.missedLessons,
    bestSubject: stats.bestSubject,
    worstSubject: stats.worstSubject,
    worryingSubjects: stats.worryingSubjects,
    goodSubjects: stats.goodSubjects,
  };
}

function buildMockSummary(context: ParentSummaryLlmContext): string {
  const { childName, subjectResults, missedLessons, bestSubject, worstSubject, worryingSubjects } =
    context;

  const subjectsLine =
    subjectResults.length > 0
      ? subjectResults
          .map((s) => `${s.subject}: итог ${s.finalPercent ?? "—"}%, оценка ${s.gradeLabel}`)
          .join("; ")
      : "по предметам пока недостаточно данных для итога.";

  const focus =
    worryingSubjects.length > 0
      ? `Стоит поддержать ребёнка по: ${worryingSubjects.join(", ")}.`
      : "Сильные стороны и зоны внимания отражены в цифрах выше.";

  return `Краткая сводка по ${childName}. ${subjectsLine} Лучший предмет по итоговому проценту: ${bestSubject ?? "нет данных"}. Самый сложный предмет: ${worstSubject ?? "нет данных"}. Пропуски без уважительной причины (по данным журнала): ${missedLessons}. ${focus}`;
}

async function generateWithOpenAi(context: ParentSummaryLlmContext): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return buildMockSummary(context);
  }

  const dataJson = JSON.stringify(context, null, 2);

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
            "Ты помощник для родителей учеников казахстанской школы. Пиши тепло, по-русски, кратко (3–5 предложений), как письмо родителю. " +
            "Никогда не используй плейсхолдеры вроде [имя], [Ваше имя], [ребёнок] — всегда пиши настоящее имя ребёнка из поля childName в JSON. " +
            "Не выдумывай оценки и проценты: опирайся только на JSON ниже.",
        },
        {
          role: "user",
          content:
            "Используй только эти данные, не придумывай цифры и не добавляй факты, которых нет в JSON.\n\n" +
            dataJson +
            "\n\n" +
            "Задача: недельная сводка для родителя о ребёнке " +
            context.childName +
            ". Укажи, что хорошо (опираясь на bestSubject и goodSubjects), что требует внимания (worstSubject, worryingSubjects), упомяни missedLessons если > 0. " +
            "Один конкретный совет родителю. Обращайся к родителю на «вы».",
        },
      ],
      temperature: 0.4,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI request failed");
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return payload.choices?.[0]?.message?.content?.trim() || buildMockSummary(context);
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

    const childName = parentProfile.child.user.name;

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

    const { bestSubject, worstSubject } = bestAndWorstSubject(subjectResults);

    const missedLessons = gradesLastWeek.filter((grade) => !grade.attendance).length;

    const stats: WeeklyStats = {
      subjectSummary: subjectResults,
      missedLessons,
      worryingSubjects,
      goodSubjects,
      bestSubject,
      worstSubject,
    };

    const llmContext = buildLlmContext(childName, stats);

    let summary = "";
    try {
      summary = await generateWithOpenAi(llmContext);
    } catch {
      summary = buildMockSummary(llmContext);
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
