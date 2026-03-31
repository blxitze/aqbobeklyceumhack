import { computeKazakhGrade } from "@/lib/bilimclass";
import { prisma } from "@/lib/prisma";

export type KioskTopStudent = {
  name: string;
  className: string;
  finalPercent: number;
  predictedGrade: 2 | 3 | 4 | 5;
};

export type KioskSubstitution = {
  originalTeacherName: string;
  substituteTeacherName: string | null;
  reason: string;
  date: string;
};

export type KioskAnnouncement = {
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
};

export type KioskData = {
  topStudents: KioskTopStudent[];
  substitutions: KioskSubstitution[];
  announcements: KioskAnnouncement[];
};

function weekRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export async function getKioskData(): Promise<KioskData> {
  const now = new Date();
  const { start: weekStart, end: weekEnd } = weekRange(now);

  const studentProfiles = await prisma.studentProfile.findMany({
    include: {
      user: { select: { name: true } },
      class: { select: { name: true } },
      grades: {
        where: {
          date: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
      },
    },
  });

  const topStudentsRaw: KioskTopStudent[] = [];
  for (const student of studentProfiles) {
    const summary = computeKazakhGrade(student.grades);
    if (summary.finalPercent === null || summary.predictedGrade === null) {
      continue;
    }
    topStudentsRaw.push({
      name: student.user.name,
      className: student.class.name,
      finalPercent: Number(summary.finalPercent.toFixed(1)),
      predictedGrade: summary.predictedGrade,
    });
  }

  const topStudents = topStudentsRaw.sort((a, b) => b.finalPercent - a.finalPercent).slice(0, 5);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const substitutionsRaw = await prisma.substitution.findMany({
    where: { date: { gte: today, lt: tomorrow } },
    include: {
      originalTeacher: { include: { user: true } },
      substituteTeacher: { include: { user: true } },
    },
    orderBy: { date: "asc" },
  });

  const substitutions: KioskSubstitution[] = substitutionsRaw.map((substitution) => ({
    originalTeacherName: substitution.originalTeacher.user.name,
    substituteTeacherName: substitution.substituteTeacher?.user.name ?? null,
    reason: substitution.reason,
    date: substitution.date.toISOString(),
  }));

  const announcementsRaw = await prisma.announcement.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { author: true },
  });

  const announcements: KioskAnnouncement[] = announcementsRaw.map((announcement) => ({
    title: announcement.title,
    body: announcement.body,
    authorName: announcement.author.name,
    createdAt: announcement.createdAt.toISOString(),
  }));

  return { topStudents, substitutions, announcements };
}
