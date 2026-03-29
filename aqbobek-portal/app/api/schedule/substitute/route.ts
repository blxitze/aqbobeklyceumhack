import { NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type SubstitutePayload = {
  teacherId?: string;
  date?: string;
  reason?: string;
};

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as SubstitutePayload;
    const teacherId = body.teacherId?.trim();
    const reason = body.reason?.trim();
    const date = body.date ? new Date(body.date) : new Date();

    if (!teacherId || !reason) {
      return NextResponse.json({ error: "teacherId и reason обязательны" }, { status: 400 });
    }

    await prisma.substitution.create({
      data: {
        originalTeacherId: teacherId,
        date,
        reason,
      },
    });

    const fastapiUrl = process.env.FASTAPI_URL;
    const internalSecret = process.env.INTERNAL_SECRET;

    if (!fastapiUrl || !internalSecret) {
      return NextResponse.json({
        schedule: [],
        message: "FastAPI недоступен — используйте ручной режим",
      });
    }

    try {
      const response = await fetch(`${fastapiUrl.replace(/\/$/, "")}/schedule/substitute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": internalSecret,
        },
        body: JSON.stringify({
          teacher_id: teacherId,
          date: date.toISOString().slice(0, 10),
          reason,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        throw new Error("FastAPI request failed");
      }

      const payload = (await response.json()) as Record<string, unknown>;
      return NextResponse.json(payload);
    } catch {
      return NextResponse.json({
        schedule: [],
        message: "FastAPI недоступен — используйте ручной режим",
      });
    }
  } catch (error) {
    console.error("POST /api/schedule/substitute failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
