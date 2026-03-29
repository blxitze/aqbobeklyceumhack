import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ message: "AI parent summary route" });
}
