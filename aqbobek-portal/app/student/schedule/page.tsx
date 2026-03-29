import { requireAuth } from "@/lib/auth";

export default async function StudentSchedulePage() {
  await requireAuth("STUDENT");
  return <h1>Student Schedule</h1>;
}
