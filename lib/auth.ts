import { SignJWT, jwtVerify } from 'jose'

/**
 * Session handling for the shared-password login.
 *
 * Everything in this file must stay runtime-agnostic: it is imported by
 * `middleware.ts`, which runs on the Edge runtime where `node:crypto` is not
 * available. Password comparison lives in `lib/password.ts` (Node only).
 */

export const SESSION_COOKIE = 'wonde_session'

const SESSION_SUBJECT = 'dashboard-viewer'

export function sessionTtlSeconds(): number {
  const raw = process.env.SESSION_TTL_HOURS
  const hours = raw ? Number(raw) : 12
  if (!Number.isFinite(hours) || hours <= 0) return 12 * 3600
  return Math.floor(hours * 3600)
}

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or shorter than 32 characters. Generate one with `npm run gen-secret`.',
    )
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(): Promise<string> {
  const ttl = sessionTtlSeconds()
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(SESSION_SUBJECT)
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secretKey())
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false
  try {
    await jwtVerify(token, secretKey(), { subject: SESSION_SUBJECT })
    return true
  } catch {
    return false
  }
}

/**
 * Guards against open redirects. Only same-origin, absolute-path targets are
 * allowed back through the `?from=` parameter on the login page.
 */
export function safeRedirectPath(candidate: string | null | undefined): string {
  if (!candidate) return '/'
  if (!candidate.startsWith('/')) return '/'
  // `//evil.com` and `/\evil.com` are treated as protocol-relative by browsers.
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return '/'
  return candidate
}
