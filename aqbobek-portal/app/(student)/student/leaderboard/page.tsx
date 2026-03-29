import { requireAuth } from '@/lib/auth'

export default async function LeaderboardPage() {
  await requireAuth('STUDENT')
  return <main><h1>Лидерборд</h1></main>
}
