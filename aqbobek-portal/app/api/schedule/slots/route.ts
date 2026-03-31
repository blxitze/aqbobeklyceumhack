import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { dateToIsoWeekday } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const date = searchParams.get("date");

  if (!classId || !date) {
    return NextResponse.json({ slots: [] });
  }

  const dayOfWeek = dateToIsoWeekday(date);

  const slots = await prisma.scheduleSlot.findMany({
    where: {
      classId,
      dayOfWeek,
      isActive: true,
    },
    include: { class: true },
    orderBy: { timeSlot: "asc" },
  });

  return NextResponse.json({
    slots: slots.map((s: typeof slots[number]) => ({
      id: s.id,
      classId: s.classId,
      className: s.class?.name ?? "",
      subject: s.subject,
      teacherId: s.teacherId ?? "",
      room: s.room,
      dayOfWeek: s.dayOfWeek,
      timeSlot: s.timeSlot,
    })),
  });
}
