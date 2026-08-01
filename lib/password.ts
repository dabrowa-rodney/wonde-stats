import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Node-only helpers. Kept out of `lib/auth.ts` so that the Edge middleware
 * never pulls `node:crypto` into its bundle.
 */

/**
 * Constant-time string comparison. Both sides are hashed first so the
 * comparison length is fixed regardless of the attempted password's length.
 */
export function secureCompare(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a, 'utf8').digest()
  const hb = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(ha, hb)
}

export function configuredPassword(): string {
  const password = process.env.DASHBOARD_PASSWORD
  if (!password) {
    throw new Error('DASHBOARD_PASSWORD is not set.')
  }
  return password
}
