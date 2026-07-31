# Wonde Stats

A small Next.js app that hosts static HTML dashboards behind a shared-password
login. Drop an HTML file into `dashboards/`, commit it, and it appears on the
home page — no code changes needed.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run gen-secret        # paste the output into SESSION_SECRET
# set DASHBOARD_PASSWORD to whatever you want people to type
npm run dev               # http://localhost:3000
```

## Environment variables

| Variable             | Required | Description                                              |
| -------------------- | -------- | -------------------------------------------------------- |
| `DASHBOARD_PASSWORD` | yes      | The shared password on the login page.                    |
| `SESSION_SECRET`     | yes      | Signs the session cookie. Minimum 32 chars.               |
| `SESSION_TTL_HOURS`  | no       | How long a login lasts. Defaults to `12`.                 |

Both required variables must be set in Vercel under
**Project → Settings → Environment Variables** as well as locally. Changing
`SESSION_SECRET` invalidates every existing session, which is the fastest way
to force everyone to sign in again.

## Adding a dashboard

Put the file in `dashboards/` and commit. Full details in
[`dashboards/README.md`](dashboards/README.md), but the short version:

```
dashboards/attendance.html      ->  /dashboard/attendance
dashboards/attendance/index.html ->  /dashboard/attendance   (+ relative assets)
```

Card titles come from the file's `<title>` tag, or from an optional
`dashboards/manifest.json` if you want to override titles, descriptions or
ordering.

## Deploying to Vercel

```bash
npx vercel            # first deploy, links the project
npx vercel --prod
```

Set `DASHBOARD_PASSWORD` and `SESSION_SECRET` in the project's environment
variables before the first production deploy, or login will return a 500.

`vercel.json` pins `"framework": "nextjs"`. The Vercel project was created
while the repo was still empty, so framework auto-detection found nothing and
the project's `framework` was left `null` — which makes Vercel run a static
build and fail with *"No Output Directory named `public` found"*. Pinning it in
the repo fixes that for every deploy and every future clone, rather than
relying on a dashboard setting.

Dashboards are committed to the repo and shipped with the deployment, so
publishing a new one means pushing a commit. `next.config.ts` uses
`outputFileTracingIncludes` to make sure the `dashboards/` folder is bundled
into the serverless functions that read it.

## How the auth works

- `middleware.ts` runs on every request except `/login`, `/api/auth/*` and
  Next's own build output. No valid session cookie means a redirect to
  `/login?from=…`.
- `POST /api/auth/login` compares the submitted password against
  `DASHBOARD_PASSWORD` in constant time, then sets an `HttpOnly`, `SameSite=Lax`,
  `Secure`-in-production cookie holding a short-lived HS256 JWT signed with
  `SESSION_SECRET`.
- `POST /api/auth/logout` clears it.
- Login attempts are rate limited to 10 per 15 minutes per IP.

Dashboards are deliberately **not** in `public/`. They are read from disk at
request time by `app/d/[...path]/route.ts`, which only runs after the
middleware has validated the session. That route also resolves and canonicalises
every path against the `dashboards/` root, so `..` segments and symlinks cannot
escape it. Moving dashboards into `public/` would make them world-readable.

## Layout

```
app/
  page.tsx                  index of dashboards
  login/                    login page + client form
  dashboard/[slug]/         viewer shell (chrome + iframe)
  d/[...path]/route.ts      authenticated file serving
  api/auth/                 login + logout
  globals.css               all design tokens live here
lib/
  auth.ts                   session cookie (Edge-safe)
  password.ts               constant-time compare (Node only)
  rate-limit.ts             login throttling
  dashboards.ts             disk discovery + safe path resolution
dashboards/                 your HTML goes here
middleware.ts               the auth gate
```

## Known limitations

- **Branding is not applied yet.** `app/globals.css` contains neutral
  placeholder tokens, not Wonde 3.0 brand values. The canonical spec at
  `skills.wonde.com` was unreachable from the build environment (the network
  policy returned 403), so no colours were guessed. Replacing the `:root` block
  in that one file, plus adding the Gilroy webfont to `public/fonts`, brands the
  whole app — nothing else hardcodes a colour or typeface.
- **Rate limiting is per-instance.** It is held in memory, so on serverless it
  slows a brute force rather than stopping one. If the dashboards ever hold
  genuinely sensitive data, move it to Vercel KV / Upstash, or put the
  deployment behind Vercel Deployment Protection.
- **One shared password, no per-user identity.** There is no audit trail of who
  viewed what. Moving to per-user accounts or SSO is a contained change: the
  session cookie and middleware already exist, only the credential check and a
  user store would need to be added.
- **Uploaded HTML is trusted.** Dashboards are rendered in an iframe so their
  CSS and scripts cannot touch the app shell, but they are same-origin, so only
  publish HTML you produced.

## The `overrides` block in package.json

Next 15 pins `postcss` to exactly `8.4.31` and `sharp` to `^0.34.3`. Both carry
high-severity advisories, and no released Next version picks up the patched
versions — `npm audit fix --force` "solves" this by downgrading to `next@9`.
The `overrides` block forces the patched `postcss@8.5.x` and `sharp@0.35.x`
instead, which brings `npm audit` to zero findings. Neither is breaking here:
`postcss` is a semver-minor bump, and `sharp` only backs `next/image`, which
this app does not use. Revisit when Next bumps them upstream.
