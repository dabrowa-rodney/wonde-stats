import Link from 'next/link'
import SiteHeader from './site-header'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="main">
        <h1 className="pageHeading">Not found</h1>
        <p className="pageSubheading">
          That dashboard doesn&rsquo;t exist, or it hasn&rsquo;t been uploaded
          yet.
        </p>
        <Link className="button button--primary" href="/">
          Back to dashboards
        </Link>
      </main>
    </>
  )
}
