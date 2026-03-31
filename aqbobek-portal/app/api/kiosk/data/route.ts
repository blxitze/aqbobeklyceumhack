import { NextResponse } from "next/server";

import { getKioskData } from "@/lib/kiosk-data";

export async function GET() {
  try {
    const data = await getKioskData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/kiosk/data failed:", error);
    return NextResponse.json(
      {
        topStudents: [],
        substitutions: [],
        announcements: [],
      },
      { status: 500 },
    );
  }
}
