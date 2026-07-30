import { NextResponse } from 'next/server'
import { SESSION_COOKIE, createSessionToken, sessionTtlSeconds } from '@/lib/auth'
import { configuredPassword, secureCompare } from '@/lib/password'
import { checkRateLimit, clientKey, resetRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  let password: unknown
  try {
    const body = await request.json()
    password = (body as { password?: unknown })?.password
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ error: 'Enter the password.' }, { status: 400 })
  }

  const key = clientKey(request)
  const limit = checkRateLimit(key)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }

  let expected: string
  try {
    expected = configuredPassword()
  } catch {
    console.error('DASHBOARD_PASSWORD is not configured.')
    return NextResponse.json(
      { error: 'Login is not configured. Contact the site owner.' },
      { status: 500 },
    )
  }

  if (!secureCompare(password, expected)) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 })
  }

  let token: string
  try {
    token = await createSessionToken()
  } catch {
    console.error('SESSION_SECRET is missing or too short.')
    return NextResponse.json(
      { error: 'Login is not configured. Contact the site owner.' },
      { status: 500 },
    )
  }

  resetRateLimit(key)

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionTtlSeconds(),
  })
  return response
}
