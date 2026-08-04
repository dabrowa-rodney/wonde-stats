import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { dashboardSrc, getDashboard, listDashboards } from '@/lib/dashboards'
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
  const dashboards = await listDashboards()
  const dashboard = dashboards.find((entry) => entry.slug === slug) ?? null

  if (!dashboard) notFound()

  return (
    <div className="viewer">
      {/*
        "All dashboards" is hidden while this is the only one, since / would
        just redirect straight back here.
      */}
      <SiteHeader title={dashboard.title} showIndexLink={dashboards.length > 1} />
      {/*
        The uploaded HTML is rendered in an iframe so its CSS and scripts stay
        fully isolated from the app shell. It is served from /d/…, which sits
        behind the same auth middleware as this page.
      */}
      <iframe
        className="viewer__frame"
        src={dashboardSrc(dashboard)}
        title={dashboard.title}
      />
    </div>
  )
}
