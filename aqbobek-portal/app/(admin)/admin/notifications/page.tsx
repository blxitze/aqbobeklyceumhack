import { requireAuth } from '@/lib/auth'

export default async function AdminNotifications() {
  await requireAuth('ADMIN')
  return <main><h1>Уведомления</h1></main>
}
