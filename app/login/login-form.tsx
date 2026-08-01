'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { safeRedirectPath } from '@/lib/auth'

export default function LoginForm({ from }: { from: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return

    setPending(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error ?? 'Something went wrong. Try again.')
        setPassword('')
        setPending(false)
        return
      }

      // Full navigation so the middleware re-runs with the new cookie.
      router.replace(safeRedirectPath(from))
      router.refresh()
    } catch {
      setError('Could not reach the server. Check your connection.')
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <label className="field">
        <span className="field__label">Password</span>
        <input
          className="field__input"
          type="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          autoFocus
          required
          disabled={pending}
        />
      </label>

      <button
        className="button button--primary button--block"
        type="submit"
        disabled={pending || password.length === 0}
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
