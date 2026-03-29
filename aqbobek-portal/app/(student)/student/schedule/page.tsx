import { requireAuth } from '@/lib/auth'

export default async function SchedulePage() {
  await requireAuth('STUDENT')
  return <main><h1>Расписание</h1></main>
}
