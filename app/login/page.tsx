import type { Metadata } from 'next'
import LoginForm from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams

  return (
    <main className="login">
      <div className="login__card">
        <div className="login__mark" aria-hidden="true">
          W
        </div>
        <h1 className="login__title">Wonde Stats</h1>
        <p className="login__subtitle">
          Enter the password to view the dashboards.
        </p>

        <LoginForm from={from ?? '/'} />

        <p className="login__footer">Internal use only.</p>
      </div>
    </main>
  )
}
