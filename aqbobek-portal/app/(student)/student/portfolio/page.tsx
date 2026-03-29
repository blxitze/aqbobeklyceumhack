import { requireAuth } from '@/lib/auth'

export default async function PortfolioPage() {
  await requireAuth('STUDENT')
  return <main><h1>Портфолио</h1></main>
}
