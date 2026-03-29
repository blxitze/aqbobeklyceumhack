import { requireAuth } from "@/lib/auth";

export default async function AdminSchedulePage() {
  await requireAuth("ADMIN");
  return <h1>Admin Schedule</h1>;
}
