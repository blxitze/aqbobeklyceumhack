import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import type { Session } from 'next-auth'

import { auth } from '@/auth'

export async function requireAuth(role?: Role) {
  const session = await auth()

  if (!session?.user) {
    redirect('/login')
  }

  if (role && session.user.role !== role) {
    redirect('/login')
  }

  return session
}

export async function getSession() {
  return auth()
}

export function isRole(session: Session | null, role: Role) {
  return session?.user?.role === role
}
