# Texas Police Jurisdiction Finder (TPJ-Finder)

A progressive web app (PWA) that tells you which Texas law enforcement agency serves your location. Enter an address or use your GPS position, and TPJ-Finder resolves the governing jurisdiction (city police → county sheriff → Texas DPS) and shows the real non-emergency contact information for that agency.

Designed for **non-emergency** use only. For emergencies, dial **9-1-1**.

## Highlights

- **Installable PWA** — add to home screen and run standalone, with offline support
- **GPS location lookup** — one tap finds your current position
- **Address search** — free-text address, zip, or city (Texas only)
- **Real jurisdiction data** — live GIS boundary queries against ArcGIS and Census TIGER endpoints (not mock/preset data)
- **Full contact cards** — non-emergency phone (tap-to-call), address, website, and online reporting links when available
- **Light & dark themes** — manual toggle plus automatic follow of the OS preference
- **Admin panel** — manage agency contacts and publish changes straight to the repo

## Features

### Jurisdiction Lookup

1. **GPS or address** — the app geocodes your position/query and verifies it is inside Texas.
2. **City match** — the city police department is the primary agency.
3. **County match** — the county sheriff's office is shown as the secondary agency (or the primary one for unincorporated areas).
4. **Special districts** — ISD police and college/university police are matched and listed as *"Also Serving This Area"*.
5. **State fallback** — if nothing else matches, Texas DPS is shown as the default jurisdiction.

### Geocoding (forward & reverse)

- **Nominatim (OpenStreetMap)** is the primary geocoder — best coverage for partial street names and landmarks.
- **Census Bureau Geocoder** is the automatic fallback — better coverage for rural/newer addresses.

### Boundary Data Sources

Jurisdiction matching runs live against real spatial data with multiple fallbacks per source:

- **Cities** — ArcGIS `TDC_Eligible_cities` / TxDOT cities, falling back to Census TIGER places.
- **Counties** — ArcGIS `Texas_County_Boundaries` (primary + detailed), falling back to TxDOT.
- **ISDs** — Census TIGER school districts (real polygon intersection, exact match).
- **Colleges** — no standard public campus-boundary dataset exists, so campuses are matched by **proximity** to an admin-entered center point + radius.

### Contact Information

Agency cards render whatever is on file:

- Non-emergency phone (tap-to-call as a `tel:` link)
- Street address
- Agency website
- Online reporting URL when the agency offers it

When no contact is on file, the app shows a helpful **search suggestion** (e.g. `Search: "Austin Texas police non-emergency"`) that links to the relevant search — so the card is still useful.

### Texas Map Beacon

After a lookup, a stylized inline-SVG map of Texas displays a pulsing beacon at your exact location, projected from the lat/lng using the same equirectangular projection the map path was generated with.

### Themes

- Light/dark toggle button (persisted in `localStorage`)
- Follows the OS `prefers-color-scheme` when no saved preference exists
- CSS custom properties drive both themes; a pre-paint script prevents a theme flash
- The iOS "navbar" (Safari toolbar/status-bar tint) is kept in sync via the `theme-color` meta tag, and the root background is themed so dark mode has no white overscroll band

### Suggest a Correction

Every agency card has **Suggest a correction**. A submission becomes a real GitHub issue (labeled `correction`) when made from a browser with an active admin session; otherwise it is stored locally on that visitor's device for the admin to review.

## Offline & PWA Behavior

The service worker (`sw.js`) keeps the app installable and fast:

- **App shell** (`index.html`, `styles.css`, `app.js`, `admin.html`, `admin.js`, `admin.css`) — network-first with a cached fallback, so deploys take effect immediately online and the app still opens offline.
- **Static assets** (icons, images, manifest) — cache-first.
- **GIS/geocoding APIs & `agency-data.json`** — network-first with **no** stale fallback, because a wrong jurisdiction is worse than an error; a clear JSON error (HTTP `503`) is returned when offline.
- **CDNs** (Font Awesome, web fonts) — stale-while-revalidate.
- **Ad networks** — explicitly bypassed so AdSense behaves exactly as it would without a service worker.

Bump `CACHE_NAME` in `sw.js` on any deploy that changes the caching logic.

## Project Structure

```
.
├── index.html       # Public app shell (single page)
├── app.js           # Public app logic (lookup, rendering, themes, corrections)
├── styles.css       # Styles, incl. dark-theme CSS variables
├── admin.html       # Admin panel (password-protected)
├── admin.js         # Admin logic (CRUD, GitHub publish, bulk import)
├── admin.css        # Admin styles
├── sw.js            # Service worker + caching strategies
├── manifest.json    # PWA (manifest: used by the web build)
├── assets/
│   ├── site.webmanifest   # PWA manifest (used by the site)
│   └── *.png / icons       # Icons and map photo badges
├── agency-data.json # Published agency contacts (single source of truth for visitors)
└── src/             # (Experimental Expo/React Native scaffold — not the deployed app)
```

The deployed product is the PWA (HTML/CSS/JS + service worker) at the repo root. The `src/` directory is an early, experimental Expo React Native scaffold that is **not** part of the live web app.

## Managing Agency Data

Agency contacts live in `agency-data.json` in this repository. Visitors always read the **published** file — there is deliberately no `localStorage` fallback in `app.js`, so admin edits only take effect once actually published.

### Admin panel (`admin.html`)

- **Password gate** before the panel loads.
- **Add / edit** city, county, ISD, college, and state agencies with full contact details.
- **Campus lookup** — resolve a college's coordinates via OpenStreetMap.
- **Bulk import colleges** — query OpenStreetMap for every TX university/college and import the ones you want.
- **Import / export** — JSON backup/restore.
- **Correction submissions** — review GitHub-created issues and local submissions side by side.
- **Set default agency** — configure the state fallback (normally Texas DPS).

### Publishing to GitHub

1. Sign in with a GitHub token (kept only in the tab's session, never stored).
2. Make your edits, then **Publish to GitHub**.
3. The token is used for that request only; GitHub Pages redeploys from the pushed commit.

> **Security note:** Never commit a GitHub token to this repository or to frontend source. For unattended publishing, use a small authenticated server or a GitHub App instead of a browser token.

## Local Development

Serving the repo root directory is all that's required — no build step, no dependencies.

```bash
# Any static server works; e.g.:
python -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000/`.

## Deployment

Deploy the repo root as static files. The project is set up for **GitHub Pages** (from the `main` branch or a `gh-pages` branch), including sub-path hosting (e.g. `GHUSER.github.io/Police-Finder/`). The service worker's paths are relative to its own URL, so the same files work at the repo root or under a sub-path.

Remember to bump `CACHE_NAME` in `sw.js` when the caching strategy changes, so older clients purge stale caches on activate.

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/new-feature`.
3. Commit your changes: `git commit -am 'Add new feature'`.
4. Push and open a pull request.

## License

MIT — see the LICENSE file for details.

---

**Important:** This app is for non-emergency contact information only. For emergencies, always dial **9-1-1**.