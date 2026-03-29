import { requireAuth } from '@/lib/auth'

export default async function AdminDashboard() {
  await requireAuth('ADMIN')
  return <main><h1>Админ панель</h1></main>
}
