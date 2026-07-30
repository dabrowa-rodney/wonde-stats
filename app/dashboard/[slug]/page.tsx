import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getDashboard } from '@/lib/dashboards'
import SiteHeader from '../../site-header'

export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const dashboard = await getDashboard(slug)
  return { title: dashboard?.title ?? 'Dashboard' }
}

export default async function DashboardPage({ params }: Props) {
  const { slug } = await params
  const dashboard = await getDashboard(slug)

  if (!dashboard) notFound()

  return (
    <div className="viewer">
      <SiteHeader title={dashboard.title} />
      {/*
        The uploaded HTML is rendered in an iframe so its CSS and scripts stay
        fully isolated from the app shell. It is served from /d/<slug>, which
        sits behind the same auth middleware as this page.
      */}
      <iframe
        className="viewer__frame"
        src={`/d/${encodeURIComponent(dashboard.slug)}`}
        title={dashboard.title}
      />
    </div>
  )
}
