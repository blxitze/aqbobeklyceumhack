import { requireAuth } from '@/lib/auth'

export default async function AdminSchedule() {
  await requireAuth('ADMIN')
  return <main><h1>Расписание</h1></main>
}
