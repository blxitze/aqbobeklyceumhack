import { NextResponse } from 'next/server'
import NextAuth from 'next-auth'

import authConfig from '@/auth.config'

const { auth } = NextAuth(authConfig)

function requiredRoleForPath(pathname: string) {
  if (pathname.startsWith('/student')) return 'STUDENT'
  if (pathname.startsWith('/teacher')) return 'TEACHER'
  if (pathname.startsWith('/parent')) return 'PARENT'
  if (pathname.startsWith('/admin')) return 'ADMIN'
  return null
}

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const session = req.auth
  const role = session?.user?.role

  if (pathname === '/kiosk') {
    return NextResponse.next()
  }

  if (pathname === '/login') {
    if (session?.user) {
      if (role === 'STUDENT') return NextResponse.redirect(new URL('/student/dashboard', nextUrl))
      if (role === 'TEACHER') return NextResponse.redirect(new URL('/teacher/dashboard', nextUrl))
      if (role === 'PARENT') return NextResponse.redirect(new URL('/parent/dashboard', nextUrl))
      if (role === 'ADMIN') return NextResponse.redirect(new URL('/admin/dashboard', nextUrl))
    }
    return NextResponse.next()
  }

  const requiredRole = requiredRoleForPath(pathname)
  if (!requiredRole) {
    return NextResponse.next()
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  if (role !== requiredRole) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/login', '/student/:path*', '/teacher/:path*', '/parent/:path*', '/admin/:path*']
}
