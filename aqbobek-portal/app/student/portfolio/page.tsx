import { requireAuth } from "@/lib/auth";

export default async function StudentPortfolioPage() {
  await requireAuth("STUDENT");
  return <h1>Student Portfolio</h1>;
}
