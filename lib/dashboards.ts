import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * Dashboards live on disk in `/dashboards` and are discovered at request time.
 * Two layouts are supported:
 *
 *   dashboards/attendance.html            -> /dashboard/attendance
 *   dashboards/attendance/index.html      -> /dashboard/attendance
 *                                            (plus any sibling assets)
 *
 * Titles come from `dashboards/manifest.json` if present, otherwise from the
 * file's own <title> tag, otherwise from the slug.
 */

export const DASHBOARDS_DIR = path.join(process.cwd(), 'dashboards')

const IGNORED = new Set(['manifest.json', 'readme.md', '.gitkeep', '.ds_store'])

export type Dashboard = {
  slug: string
  title: string
  description: string | null
  /** Path of the entry HTML file, relative to DASHBOARDS_DIR. */
  entry: string
  updatedAt: string
}

type ManifestEntry = {
  title?: string
  description?: string
  order?: number
  hidden?: boolean
}

type Manifest = Record<string, ManifestEntry>

/** Slugs are used to build filesystem paths, so keep them boring. */
export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(slug) && !slug.includes('..')
}

async function readManifest(): Promise<Manifest> {
  try {
    const raw = await fs.readFile(path.join(DASHBOARDS_DIR, 'manifest.json'), 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Manifest) : {}
  } catch {
    return {}
  }
}

function titleFromSlug(slug: string): string {
  const words = slug.replace(/[-_.]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
}

/**
 * Pulls <title> and <meta name="description"> out of the head. Only the first
 * 16 KB is read — enough for any sane document head, and it keeps the index
 * page fast when dashboards carry large inline datasets.
 */
async function readHtmlMeta(
  absolutePath: string,
): Promise<{ title: string | null; description: string | null }> {
  let head = ''
  try {
    const handle = await fs.open(absolutePath, 'r')
    try {
      const buffer = Buffer.alloc(16 * 1024)
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0)
      head = buffer.subarray(0, bytesRead).toString('utf8')
    } finally {
      await handle.close()
    }
  } catch {
    return { title: null, description: null }
  }

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const descMatch = head.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  )

  const title = titleMatch ? decodeEntities(titleMatch[1]!).trim() : null
  const description = descMatch ? decodeEntities(descMatch[1]!).trim() : null

  return { title: title || null, description: description || null }
}

export async function listDashboards(): Promise<Dashboard[]> {
  let entries
  try {
    entries = await fs.readdir(DASHBOARDS_DIR, { withFileTypes: true })
  } catch {
    return []
  }

  const manifest = await readManifest()
  const dashboards: Array<Dashboard & { order: number }> = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    if (IGNORED.has(entry.name.toLowerCase())) continue

    let slug: string
    let relativeEntry: string

    if (entry.isDirectory()) {
      slug = entry.name
      relativeEntry = path.join(entry.name, 'index.html')
      try {
        await fs.access(path.join(DASHBOARDS_DIR, relativeEntry))
      } catch {
        continue // A folder without an index.html isn't a dashboard.
      }
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) {
      slug = entry.name.slice(0, -'.html'.length)
      relativeEntry = entry.name
    } else {
      continue
    }

    if (!isValidSlug(slug)) continue

    const override = manifest[slug] ?? {}
    if (override.hidden) continue

    const absoluteEntry = path.join(DASHBOARDS_DIR, relativeEntry)
    const [meta, stat] = await Promise.all([
      readHtmlMeta(absoluteEntry),
      fs.stat(absoluteEntry),
    ])

    dashboards.push({
      slug,
      title: override.title ?? meta.title ?? titleFromSlug(slug),
      description: override.description ?? meta.description ?? null,
      entry: relativeEntry,
      updatedAt: stat.mtime.toISOString(),
      order: typeof override.order === 'number' ? override.order : Number.MAX_SAFE_INTEGER,
    })
  }

  dashboards.sort(
    (a, b) => a.order - b.order || a.title.localeCompare(b.title, 'en-GB'),
  )

  return dashboards.map(({ order: _order, ...dashboard }) => dashboard)
}

export async function getDashboard(slug: string): Promise<Dashboard | null> {
  if (!isValidSlug(slug)) return null
  const all = await listDashboards()
  return all.find((dashboard) => dashboard.slug === slug) ?? null
}

/**
 * Resolves a request path under `/dashboards`, refusing anything that escapes
 * the directory via `..`, absolute paths, or symlinks.
 */
export async function resolveDashboardFile(
  segments: string[],
): Promise<string | null> {
  if (segments.length === 0) return null
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return null
  }

  const [slug, ...rest] = segments as [string, ...string[]]
  if (!isValidSlug(slug)) return null

  const candidates: string[] =
    rest.length === 0
      ? [path.join(DASHBOARDS_DIR, `${slug}.html`), path.join(DASHBOARDS_DIR, slug, 'index.html')]
      : [path.join(DASHBOARDS_DIR, slug, ...rest)]

  const root = await fs.realpath(DASHBOARDS_DIR).catch(() => null)
  if (!root) return null

  for (const candidate of candidates) {
    const real = await fs.realpath(candidate).catch(() => null)
    if (!real) continue
    if (real !== root && !real.startsWith(root + path.sep)) continue
    const stat = await fs.stat(real).catch(() => null)
    if (!stat?.isFile()) continue
    return real
  }

  return null
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
}

export function contentTypeFor(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}
