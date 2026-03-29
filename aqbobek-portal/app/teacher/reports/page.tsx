import { requireAuth } from "@/lib/auth";

export default async function TeacherReportsPage() {
  await requireAuth("TEACHER");
  return <h1>Teacher Reports</h1>;
}
