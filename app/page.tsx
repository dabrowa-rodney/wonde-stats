import Link from 'next/link'
import { listDashboards } from '@/lib/dashboards'
import SiteHeader from './site-header'

export const dynamic = 'force-dynamic'

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export default async function HomePage() {
  const dashboards = await listDashboards()

  return (
    <>
      <SiteHeader />
      <main className="main">
        <h1 className="pageHeading">Dashboards</h1>
        <p className="pageSubheading">
          {dashboards.length === 0
            ? 'Nothing published yet.'
            : `${dashboards.length} dashboard${dashboards.length === 1 ? '' : 's'} available.`}
        </p>

        {dashboards.length === 0 ? (
          <div className="empty">
            <h2 className="empty__title">No dashboards yet</h2>
            <p className="empty__body">
              Drop an HTML file into the{' '}
              <code className="empty__code">dashboards/</code> folder and commit
              it. A file named{' '}
              <code className="empty__code">attendance.html</code> appears here
              automatically and is served at{' '}
              <code className="empty__code">/dashboard/attendance</code>.
            </p>
          </div>
        ) : (
          <ul className="cardGrid">
            {dashboards.map((dashboard) => (
              <li key={dashboard.slug}>
                <Link className="card" href={`/dashboard/${dashboard.slug}`}>
                  <h2 className="card__title">{dashboard.title}</h2>
                  {dashboard.description ? (
                    <p className="card__description">{dashboard.description}</p>
                  ) : null}
                  <p className="card__meta">
                    Updated {dateFormatter.format(new Date(dashboard.updatedAt))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}
