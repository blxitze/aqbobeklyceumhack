import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ substitutions: [] });
  }

  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const subs = await prisma.substitution.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    include: {
      originalTeacher: { include: { user: true } },
      substituteTeacher: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    substitutions: subs.map((s: typeof subs[number]) => ({
      id: s.id,
      originalTeacherId: s.originalTeacherId,
      substituteTeacherId: s.substituteTeacherId,
      date: s.date.toISOString(),
      reason: s.reason,
      originalTeacherName: s.originalTeacher?.user?.name ?? "",
      substituteTeacherName: s.substituteTeacher?.user?.name ?? "",
    })),
  });
}
