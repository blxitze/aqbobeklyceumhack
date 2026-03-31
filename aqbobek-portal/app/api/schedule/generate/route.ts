import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { fastapi } from '@/lib/fastapi'
import { prisma } from '@/lib/prisma'
import { dateToIsoWeekday, todayLocalISO } from '@/lib/date-utils'

export async function POST(req: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const date = (body.date as string) || todayLocalISO()

  const allClasses = await prisma.class.findMany()
  const allClassIds = allClasses.map((c: { id: string }) => c.id)
  const selectedClassId: string = body.classId || allClassIds[0] || ''

  if (!selectedClassId) {
    return NextResponse.json({
      schedule: [],
      message: 'Классы не найдены',
      fastapiUsed: false,
      conflicts: [],
    })
  }

  let fastapiOk = false
  try {
    await fastapi.post('/schedule/generate', { classIds: allClassIds, date })
    fastapiOk = true
  } catch {
    // FastAPI down — will read existing from DB
  }

  const dayOfWeek = dateToIsoWeekday(date)

  const slots = await prisma.scheduleSlot.findMany({
    where: {
      classId: selectedClassId,
      dayOfWeek,
      isActive: true,
    },
    include: { class: true },
  })

  return NextResponse.json({
    schedule: slots.map((s: typeof slots[number]) => ({
      id: s.id,
      classId: s.classId,
      className: s.class?.name ?? '',
      subject: s.subject,
      teacherId: s.teacherId ?? '',
      room: s.room,
      dayOfWeek: s.dayOfWeek,
      timeSlot: s.timeSlot,
    })),
    message:
      slots.length > 0
        ? `Загружено ${slots.length} уроков`
        : 'Нет расписания на этот день — нажмите Генерировать',
    fastapiUsed: fastapiOk,
    conflicts: [],
  })
}
