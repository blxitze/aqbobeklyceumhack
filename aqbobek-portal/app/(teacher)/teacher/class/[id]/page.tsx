import { requireAuth } from '@/lib/auth'

export default async function ClassPage({ params }: { params: { id: string } }) {
  await requireAuth('TEACHER')
  return <main><h1>Класс {params.id}</h1></main>
}
