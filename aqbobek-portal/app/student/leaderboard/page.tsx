import { requireAuth } from "@/lib/auth";

export default async function StudentLeaderboardPage() {
  await requireAuth("STUDENT");
  return <h1>Student Leaderboard</h1>;
}
