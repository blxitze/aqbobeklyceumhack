import { auth } from "@/auth";
import { fastapi } from "@/lib/fastapi";
import { computeKazakhGrade, computeRiskScore, computeTrend, getRiskLevel } from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";
import { TOPICS_BY_SUBJECT, type TopicNode } from "@/lib/topics";
import { NextResponse } from "next/server";
type GradeRow = Awaited<ReturnType<typeof prisma.grade.findMany>>[number];

function selectRootTopic(subjectGrades: GradeRow[], topics: TopicNode[]): string {
  if (!subjectGrades.length) return topics[0]?.name ?? "Нет проблемных тем";

  const topicStats = new Map<string, { total: number; count: number; hasMissed: boolean }>();
  for (const grade of subjectGrades) {
    const percent = grade.maxScore > 0 ? (grade.score / grade.maxScore) * 100 : 0;
    const stat = topicStats.get(grade.topic) ?? { total: 0, count: 0, hasMissed: false };
    stat.total += percent;
    stat.count += 1;
    if (percent < 40) stat.hasMissed = true;
    topicStats.set(grade.topic, stat);
  }

  const missedTopics = Array.from(topicStats.entries())
    .filter(([, stat]) => stat.hasMissed)
    .map(([topic]) => topic);

  const topicNames = new Set(topics.map((t) => t.name));
  const dependentsMap = new Map<string, string[]>();
  for (const topic of topics) {
    if (!dependentsMap.has(topic.name)) dependentsMap.set(topic.name, []);
    for (const prereq of topic.prerequisites) {
      if (!dependentsMap.has(prereq)) dependentsMap.set(prereq, []);
      dependentsMap.get(prereq)?.push(topic.name);
    }
  }

  const isConnected = (topicName: string): boolean => {
    const topicObj = topics.find((t) => t.name === topicName);
    if (!topicObj) return false;
    return (topicObj.prerequisites?.length ?? 0) > 0 || (dependentsMap.get(topicName)?.length ?? 0) > 0;
  };

  const missedInGraph = missedTopics.filter((topic) => topicNames.has(topic));
  if (missedInGraph.length > 0) {
    missedInGraph.sort((a, b) => {
      const sa = topicStats.get(a)!;
      const sb = topicStats.get(b)!;
      return sa.total / sa.count - sb.total / sb.count;
    });
    const connectedMissed = missedInGraph.find((topic) => isConnected(topic));
    return connectedMissed ?? missedInGraph[0];
  }

  const rankedAll = Array.from(topicStats.entries())
    .filter(([topic]) => topicNames.has(topic))
    .sort((a, b) => a[1].total / a[1].count - b[1].total / b[1].count);

  const connectedFallback = rankedAll.map(([topic]) => topic).find((topic) => isConnected(topic));
  return connectedFallback ?? rankedAll[0]?.[0] ?? topics[0]?.name ?? "Нет проблемных тем";
}

function buildLearningPath(rootTopic: string, topics: TopicNode[]): string[] {
  if (!rootTopic) return [];
  const nodeNames = new Set(topics.map((t) => t.name));
  if (!nodeNames.has(rootTopic)) return [rootTopic];

  const dependentsMap = new Map<string, string[]>();
  for (const topic of topics) {
    if (!dependentsMap.has(topic.name)) dependentsMap.set(topic.name, []);
    for (const prereq of topic.prerequisites) {
      if (!dependentsMap.has(prereq)) dependentsMap.set(prereq, []);
      dependentsMap.get(prereq)?.push(topic.name);
    }
  }

  const path = [rootTopic];
  const visited = new Set(path);
  let current = rootTopic;

  while (true) {
    const nextCandidates = (dependentsMap.get(current) ?? []).filter((n) => !visited.has(n));
    if (!nextCandidates.length) break;
    const next = nextCandidates[0];
    path.push(next);
    visited.add(next);
    current = next;
  }

  if (path.length >= 2) return path;

  const directDependent = topics.find((topic) => topic.prerequisites.includes(rootTopic))?.name;
  if (directDependent && directDependent !== rootTopic) return [rootTopic, directDependent];

  const topicObj = topics.find((topic) => topic.name === rootTopic);
  const directPrereq = topicObj?.prerequisites[0];
  if (directPrereq && directPrereq !== rootTopic) return [rootTopic, directPrereq];

  const connectedNeighbor = topics.find(
    (topic) =>
      topic.name !== rootTopic &&
      (topic.prerequisites.length > 0 || topics.some((t) => t.prerequisites.includes(topic.name))),
  )?.name;
  if (connectedNeighbor) return [rootTopic, connectedNeighbor];

  const fallbackNeighbor = topics.find((topic) => topic.name !== rootTopic)?.name;
  return fallbackNeighbor ? [rootTopic, fallbackNeighbor] : [rootTopic];
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { studentId?: string };
  const studentId = body.studentId;
  if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const grades = await prisma.grade.findMany({
    where: { studentId },
    orderBy: { date: "asc" },
  });
  if (!grades.length) {
    return NextResponse.json({ error: "No grades found" }, { status: 404 });
  }

  const bySubject = new Map<string, GradeRow[]>();
  for (const grade of grades) {
    const list = bySubject.get(grade.subject) ?? [];
    list.push(grade);
    bySubject.set(grade.subject, list);
  }

  const subjectRisks = Array.from(bySubject.entries()).map(([subject, subjectGrades]) => {
    const kaz = computeKazakhGrade(subjectGrades);
    const missedTopics = Array.from(
      new Set(
        subjectGrades
          .filter((g) => (g.score / g.maxScore) * 100 < 40)
          .map((g) => g.topic),
      ),
    );
    return {
      subject,
      trend: computeTrend(subjectGrades),
      missedTopics,
      riskScore: computeRiskScore(subjectGrades),
      finalPercent: kaz.finalPercent,
      foPercent: kaz.foPercent,
      sorPercent: kaz.sorPercent,
      socPercent: kaz.socPercent,
      predictedGrade: kaz.predictedGrade,
    };
  });
  subjectRisks.sort((a, b) => b.riskScore - a.riskScore);

  const highest = subjectRisks[0];
  const highestRiskSubject = highest?.subject ?? "";
  const topics = TOPICS_BY_SUBJECT[highestRiskSubject] ?? [];
  const highestSubjectGrades = bySubject.get(highestRiskSubject) ?? [];
  const rootTopic = selectRootTopic(highestSubjectGrades, topics);
  const learningPath = buildLearningPath(rootTopic, topics);

  const riskPercent = Math.round(highest?.riskScore ?? 0);
  const riskLevel = getRiskLevel(riskPercent);

  try {
    const tutorRes = await fastapi.post("/ai/tutor-text", {
      student_id: studentId,
      subject_risks: subjectRisks.map((sr) => ({
        subject: sr.subject,
        riskScore: sr.riskScore,
        finalPercent: sr.finalPercent,
      })),
      root_topic: rootTopic,
      learning_path: learningPath,
    });

    return NextResponse.json({
      text: tutorRes.data.text,
      analysis: {
        riskLevel,
        rootProblem: rootTopic,
        studyPath: learningPath,
        subjectRisks,
      },
    });
  } catch {
    const kazGrades = grades.reduce<Record<string, typeof grades>>(
      (acc: Record<string, typeof grades>, g: GradeRow) => {
        if (!acc[g.subject]) acc[g.subject] = [];
        acc[g.subject].push(g);
        return acc;
      },
      {},
    );

    const subjects = Object.keys(kazGrades);
    return NextResponse.json({
      text: `Анализ временно недоступен. У тебя ${grades.length} оценок по ${subjects.length} предметам.`,
      analysis: null,
      fallback: true,
    });
  }
}
