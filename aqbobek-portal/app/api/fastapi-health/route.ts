import { NextResponse } from 'next/server'

import { fastapi } from '@/lib/fastapi'

export async function GET() {
  try {
    const res = await fastapi.get('/health')
    return NextResponse.json({ online: true, ...res.data })
  } catch {
    return NextResponse.json({ online: false })
  }
}
