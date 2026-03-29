import { requireAuth } from "@/lib/auth";

export default async function AdminNotificationsPage() {
  await requireAuth("ADMIN");
  return <h1>Admin Notifications</h1>;
}
