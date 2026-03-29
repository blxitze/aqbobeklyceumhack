import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "STUDENT") redirect("/student/dashboard");
  if (session.user.role === "TEACHER") redirect("/teacher/dashboard");
  if (session.user.role === "PARENT") redirect("/parent/dashboard");
  if (session.user.role === "ADMIN") redirect("/admin/dashboard");

  redirect("/login");
}
