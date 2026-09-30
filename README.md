# 🐋 Whale Tracker

Whale and orca sightings in the Salish Sea, on a map. Built with React, MapLibre, and data from the [Acartia](https://acartia.io) data cooperative.

## Features

- Interactive map with color-coded species. Orcas get their own markers labeled by pod (J, K, L, T for Bigg's).
- Filters for all whales, orcas only, or a single pod, over 24 hours, 3 days, 7 days, or everything.
- Recent sightings list and a detail view for each sighting.
- **Meet the pods**: a guide to J, K and L pods and Bigg's killer whales, with a link to each pod's latest sighting.
- Refreshes every minute. Works on desktop and phone.
- Shows sample sightings when live data isn't available, such as during local development.

## Viewing changes without installing anything

Connect the repo to Vercel (see [DEPLOY.md](./DEPLOY.md)). Each branch you push gets its own preview link, and the main site only updates when `main` changes.

## Local development (optional)

Needs [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build into dist/
```

Locally the app shows sample sightings, because the live feed runs through a Vercel function (`api/sightings.ts`).

## How live data works

```
browser ──> /api/sightings (Vercel function) ──> https://acartia.io/api/v1/sightings/current
```

The function adds your Acartia API token (the `ACARTIA_TOKEN` environment variable in Vercel) so the token never reaches the browser. It also caches responses for a minute. If the feed fails, the app switches to sample data and shows a "Sample data" badge.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables. See `.env.example`.

| Name | Required | What it's for |
| --- | --- | --- |
| `ACARTIA_TOKEN` | For live data | API token from your account at acartia.io |
| `VITE_MAP_STYLE_URL` | No | Map style. Defaults to OpenFreeMap "liberty" (free, no key) |

## Project structure

```
api/sightings.ts                 # Vercel function that proxies Acartia
public/whale.svg                 # favicon
src/
├── api/acartia.ts               # fetch + normalize sightings, sample-data fallback
├── components/
│   ├── Map.tsx                  # MapLibre map and markers
│   ├── SightingsList.tsx        # recent sightings
│   ├── SightingDetail.tsx       # one sighting
│   ├── PodGuide.tsx             # "Meet the pods"
│   ├── PodBadges.tsx, OrcaIcon.tsx
├── data/demoSightings.ts        # sample sightings
├── hooks/useSightings.ts        # TanStack Query (auto-refresh)
├── lib/species.ts               # species colors, orca pod detection, pod info
├── lib/format.ts                # "2 hr ago" etc.
├── styles/                      # CSS per component
├── App.tsx
└── main.tsx
```

## Ideas for later

- Notifications when a favorite pod is reported
- "Near me" distance to each sighting
- Dark mode
