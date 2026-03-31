import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { fastapi } from '@/lib/fastapi'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { originalTeacherId, date, reason } = await req.json()

  if (!originalTeacherId || !date) {
    return NextResponse.json(
      { error: 'originalTeacherId and date are required' },
      { status: 400 },
    )
  }

  try {
    const res = await fastapi.post('/schedule/substitute', {
      originalTeacherId,
      date,
      reason: reason || 'Не указана',
    })

    await prisma.substitution.create({
      data: {
        originalTeacherId,
        substituteTeacherId: res.data.substituteTeacherId ?? null,
        date: new Date(date),
        reason: reason || 'Не указана',
      },
    })

    return NextResponse.json(res.data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'FastAPI недоступен'
    return NextResponse.json(
      { error: msg, diff: [], updatedSlots: [], message: msg },
      { status: 503 },
    )
  }
}
