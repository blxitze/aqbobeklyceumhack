import { NextRequest, NextResponse } from "next/server";
import { PortfolioItemType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function portfolioTypes(): Set<string> {
  return new Set(Object.values(PortfolioItemType));
}

async function getStudentProfileOrResponse() {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "STUDENT") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return { error: NextResponse.json({ error: "Student profile not found" }, { status: 404 }) };
  }
  return { profile };
}

export async function GET() {
  const result = await getStudentProfileOrResponse();
  if ("error" in result) {
    return result.error;
  }

  const items = await prisma.portfolioItem.findMany({
    where: { studentId: result.profile.id },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const result = await getStudentProfileOrResponse();
  if ("error" in result) {
    return result.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { title, description, type, date } = body as Record<string, unknown>;

  if (typeof title !== "string" || title.trim().length === 0 || title.length > 200) {
    return NextResponse.json({ error: "title is required (1–200 characters)" }, { status: 400 });
  }

  if (typeof description !== "string" || description.length > 2000) {
    return NextResponse.json({ error: "description must be a string (max 2000 characters)" }, { status: 400 });
  }

  if (typeof type !== "string" || !portfolioTypes().has(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${[...portfolioTypes()].join(", ")}` },
      { status: 400 },
    );
  }

  if (typeof date !== "string" || date.length === 0) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const parsedDate = new Date(date);
  if (Number.isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "date must be a valid date string" }, { status: 400 });
  }

  const item = await prisma.portfolioItem.create({
    data: {
      studentId: result.profile.id,
      title: title.trim(),
      description: description.trim(),
      type: type as PortfolioItemType,
      date: parsedDate,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
