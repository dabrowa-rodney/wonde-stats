import Link from 'next/link'

export default function SiteHeader({
  title,
  showIndexLink = true,
}: {
  title?: string
  showIndexLink?: boolean
}) {
  return (
    <header className="appHeader">
      <Link className="appHeader__brand" href="/">
        <span className="appHeader__mark" aria-hidden="true">
          W
        </span>
        <span>Wonde Stats</span>
      </Link>

      {title ? (
        <>
          <span className="appHeader__divider" aria-hidden="true" />
          <span className="appHeader__title">{title}</span>
        </>
      ) : null}

      <div className="appHeader__spacer" />

      <div className="appHeader__actions">
        {title && showIndexLink ? (
          <Link className="button button--ghost" href="/">
            All dashboards
          </Link>
        ) : null}
        <form action="/api/auth/logout" method="post">
          <button className="button button--ghost" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}
