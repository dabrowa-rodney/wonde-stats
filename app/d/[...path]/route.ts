import { promises as fs } from 'node:fs'
import { NextResponse } from 'next/server'
import { contentTypeFor, resolveDashboardFile } from '@/lib/dashboards'

/**
 * Serves raw dashboard files. Reached only after `middleware.ts` has validated
 * the session, which is the whole reason these files are not in `/public`.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path: segments } = await params

  const filePath = await resolveDashboardFile(segments.map(decodeURIComponent))
  if (!filePath) {
    return new NextResponse('Dashboard not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const file = await fs.readFile(filePath).catch(() => null)
  if (!file) {
    return new NextResponse('Dashboard not found.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  return new NextResponse(new Uint8Array(file), {
    status: 200,
    headers: {
      'Content-Type': contentTypeFor(filePath),
      'Content-Length': String(file.byteLength),
      // Private: this is behind a login, so no shared cache should keep it.
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      // Uploaded HTML is framed by our own viewer and nowhere else.
      'Content-Security-Policy': "frame-ancestors 'self'",
    },
  })
}
