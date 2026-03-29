import { requireAuth } from '@/lib/auth'

export default async function ParentDashboard() {
  await requireAuth('PARENT')
  return <main><h1>Панель родителя</h1></main>
}
