import { requireAuth } from "@/lib/auth";

export default async function TeacherClassPage() {
  await requireAuth("TEACHER");
  return <h1>Teacher Class</h1>;
}
