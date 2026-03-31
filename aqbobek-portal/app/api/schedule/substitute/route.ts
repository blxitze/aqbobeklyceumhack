import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { dateToIsoWeekday } from '@/lib/date-utils'
import { fastapi } from '@/lib/fastapi'
import { pusherServer } from '@/lib/pusher'
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
    const result = res.data as {
      originalTeacherName?: string
      substituteTeacherName?: string
      diff?: string[]
      message?: string
      substituteTeacherId?: string | null
    }
    const dayOfWeek = dateToIsoWeekday(date)
    const substituteTeacherId: string | null = result.substituteTeacherId ?? null

    await prisma.substitution.create({
      data: {
        originalTeacherId,
        substituteTeacherId,
        date: new Date(date),
        reason: reason || 'Не указана',
      },
    })

    if (substituteTeacherId) {
      await prisma.scheduleSlot.updateMany({
        where: {
          teacherId: originalTeacherId,
          dayOfWeek,
        },
        data: {
          teacherId: substituteTeacherId,
        },
      })
    }

    if (pusherServer) {
      try {
        await pusherServer.trigger('schedule-updates', 'substitution', {
          originalTeacherName: result.originalTeacherName || '',
          substituteTeacherName: result.substituteTeacherName || '',
          diff: result.diff,
          date,
          message: result.message,
        })
      } catch (e) {
        console.error('Pusher trigger failed:', e)
        // Don't fail the request if Pusher is down
      }
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'FastAPI недоступен'
    return NextResponse.json(
      { error: msg, diff: [], updatedSlots: [], message: msg },
      { status: 503 },
    )
  }
}
