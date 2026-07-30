import { NextResponse, type NextRequest } from 'next/server'
import { SESSION_COOKIE, isValidSessionToken } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value

  if (await isValidSessionToken(token)) {
    return NextResponse.next()
  }

  const loginUrl = new URL('/login', request.url)
  const from = request.nextUrl.pathname + request.nextUrl.search
  if (from !== '/') {
    loginUrl.searchParams.set('from', from)
  }

  const response = NextResponse.redirect(loginUrl)
  // Clear an expired or tampered cookie so the browser stops resending it.
  if (token) response.cookies.delete(SESSION_COOKIE)
  return response
}

export const config = {
  // Everything is protected except the login page itself, the auth endpoints,
  // and Next.js' own build output.
  matcher: [
    '/((?!login|api/auth/|_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}
