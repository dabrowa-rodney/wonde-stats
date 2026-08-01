/**
 * Minimal in-memory fixed-window rate limiter for login attempts.
 *
 * Note: on serverless this is per-instance, so it slows down a brute force
 * rather than stopping one outright. It is a speed bump, not a guarantee — if
 * the dashboards ever hold anything sensitive, move this to a shared store
 * (Vercel KV / Upstash) or put the app behind Vercel Deployment Protection.
 */

type Window = { count: number; resetAt: number }

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 10

const attempts = new Map<string, Window>()

function sweep(now: number) {
  if (attempts.size < 1000) return
  for (const [key, window] of attempts) {
    if (window.resetAt <= now) attempts.delete(key)
  }
}

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = attempts.get(key)
  if (!existing || existing.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1, retryAfterSeconds: 0 }
  }

  existing.count += 1
  if (existing.count > MAX_ATTEMPTS) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  return {
    allowed: true,
    remaining: MAX_ATTEMPTS - existing.count,
    retryAfterSeconds: 0,
  }
}

/** Clears the window for a key. Called after a successful login. */
export function resetRateLimit(key: string): void {
  attempts.delete(key)
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}
