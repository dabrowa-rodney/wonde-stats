# Dashboards

Drop your HTML dashboards in this folder. They are picked up automatically —
no code changes, no registration step.

## Two layouts

**Single file** — for a self-contained HTML file:

```
dashboards/attendance.html   ->  /dashboard/attendance
```

**Folder** — when a dashboard has its own images, CSS or data files:

```
dashboards/attendance/
  index.html                 ->  /dashboard/attendance
  chart.js
  data.csv
  logo.png
```

Inside a folder, reference assets with **relative** paths
(`<img src="logo.png">`, `<script src="chart.js">`) so they resolve against
`/d/attendance/`. The viewer loads the dashboard at its real entry file
(`/d/attendance/index.html`) precisely so those relative URLs land inside the
dashboard's own folder.

This is what the folder layout is for. `dashboards/commercial/` uses it because
that dashboard's CSS asks for `fonts/Gilroy-Regular.woff`; dropping those font
files into `dashboards/commercial/fonts/` makes them load, with no code change.

## Naming

The folder or file name becomes the URL slug, so stick to letters, numbers,
hyphens, underscores and dots. Anything else is skipped.

Keep the slug **stable across versions**. Uploading a new draft means replacing
the file in place (`dashboards/commercial/index.html`), not adding
`commercial-draft-4/` next to it — the URL stays the same and the old version
stays in git history. The card title updates on its own, because it is read
from the file's `<title>` on each request.

## Titles and descriptions

By default the card on the home page uses the `<title>` tag from your HTML,
and the `<meta name="description">` if you have one:

```html
<title>Attendance — Autumn Term 2025</title>
<meta name="description" content="Daily attendance across all MATs." />
```

To override those, or to control ordering, add a `manifest.json` here:

```json
{
  "attendance": {
    "title": "Attendance — Autumn Term 2025",
    "description": "Daily attendance across all MATs.",
    "order": 1
  },
  "wip-draft": {
    "hidden": true
  }
}
```

Every key is optional. Dashboards without an `order` sort alphabetically after
those that have one.

`hidden: true` keeps a file in the repo but off the index, and its
`/dashboard/<slug>` page returns 404. It is **hidden, not access-controlled**:
a signed-in user who knows the slug can still fetch the raw file at
`/d/<slug>`. Don't rely on it for anything you actually need withheld from
people who can log in — delete the file instead.

## Access

All of this sits behind the login. Files here are read at request time by an
authenticated route rather than being published as static assets, so there is
no public URL for them. Do not move dashboards into `public/` — that would
serve them to anyone.
