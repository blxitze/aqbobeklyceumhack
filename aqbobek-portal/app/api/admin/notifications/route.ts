import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { pusherServer } from "@/lib/pusher";
import { prisma } from "@/lib/prisma";

type NotificationBody = {
  title?: string;
  body?: string;
  targetRole?: Role | null;
  targetClassId?: string | null;
};

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const notifications = await prisma.notification.findMany({
      include: { targetClass: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("GET /api/admin/notifications failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = (await request.json()) as NotificationBody;
    const title = payload.title?.trim();
    const body = payload.body?.trim();
    const targetClassId = payload.targetClassId?.trim() || null;
    const targetRole = payload.targetRole ?? null;

    if (!title || !body) {
      return NextResponse.json({ error: "Заголовок и сообщение обязательны" }, { status: 400 });
    }

    const created = await prisma.notification.create({
      data: {
        title,
        body,
        targetRole,
        targetClassId,
        readBy: [],
      },
    });

    try {
      await pusherServer.trigger("notifications", "new-notification", {
        title: created.title,
        body: created.body,
        targetRole: created.targetRole,
        targetClassId: created.targetClassId,
      });
    } catch (pusherError) {
      console.warn("Pusher trigger failed for notification:", pusherError);
    }

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/notifications failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
