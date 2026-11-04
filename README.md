# 🐋 Whale Tracker

Whale and orca sightings in the Salish Sea, on a map. Built with React, MapLibre, and data from the [Acartia](https://acartia.io) data cooperative.

## Features

- Interactive map with color-coded species. Orcas get their own markers labeled by pod (J, K, L, T for Bigg's).
- Filters for all whales, orcas only, or a single pod, over 24 hours, 3 days, 7 days, or everything.
- Recent sightings list and a detail view for each sighting.
- **Listen live**: hydrophones (underwater microphones) from [Orcasound](https://live.orcasound.net) appear on the map. You can play any of them live in the app, and a hydrophone pulses when listeners or Orcasound's AI detector report whale sounds there in the last two hours.
- **Seattle orca alert**: a banner appears when orcas look to be heading toward Seattle, with an arrival estimate. The same alert is available at `/api/alert` for a lamp or other device.
- **Whale-watch boats**: live positions of local whale-watching boats (from public AIS data via aisstream.io). Trails show where they've been, docked boats are greyed out, and when 2+ boats slow down together away from harbor the map flags "boats gathered", a sign whales are probably nearby.
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

Acartia's current-sightings feed (the last 7 days) is public, so no API key is needed. The function avoids browser cross-origin (CORS) problems and caches responses for a minute. If you set an optional `ACARTIA_TOKEN`, it is sent along, and it stays on the server. Hydrophone locations, recent whale-sound reports, and the live audio come straight from Orcasound's public API (`src/api/orcasound.ts`). No key is needed.

If the feed fails, the app switches to sample data and shows a "Sample data" badge.

## Seattle orca alert (`/api/alert`)

A lamp or other device can check this address every minute or so:

| URL | Returns |
| --- | --- |
| `/api/alert` | JSON: `ok`, `level`, `state`, `color`, `effect`, `title`, `message`, `etaMinutes`, … |
| `/api/alert?format=text` | Just the level: `0`, `1`, `2` or `3` |
| `/api/alert?test=approaching` | A pretend alert for testing (`none`, `watch`, `approaching`, `here`) |

| Level | State | Suggested light | When |
| --- | --- | --- | --- |
| 0 | none | off | Nothing relevant |
| 1 | watch | amber, slow breathe | Orcas in Puget Sound within ~60 km of Seattle in the last 2 hr, direction unknown; or whale sounds on a nearby hydrophone in the last hour |
| 2 | approaching | cyan, pulse | Orcas within ~60 km heading toward Seattle: "southbound" north of Seattle or "northbound" south of it, or later sightings getting closer. Includes an arrival estimate using the pod's own pace toward Seattle, measured from its sightings over the last 2½ hr (median, kept between 1.5 and 10 km/h); with only one report it assumes 7 km/h, or 4 km/h if the report says slow/foraging |
| 3 | here | blue, solid | Orcas within ~5 km of a watching spot in the last 90 min: Richmond Beach, Carkeek Park, Golden Gardens, Discovery Park, Elliott Bay, Alki or Lincoln Park (`spots` in `ALERT_CONFIG`) |

Hood Canal, whales heading away, and species other than orcas are ignored. The distances, speed, and home point are in `ALERT_CONFIG` in `src/lib/alert.ts`, and the website banner uses the same code.

## Whale-watch boats (`/api/boats`)

`api/boats.ts` opens aisstream.io's live feed for up to ~25 seconds, keeps only the boats in `src/data/whaleWatchFleet.ts`, and returns their latest positions. Vercel's CDN reuses the answer for a minute. The browser remembers recent positions so it can draw trails.

To add or remove a boat, edit `WHALE_WATCH_FLEET` in `src/data/whaleWatchFleet.ts` (you need the boat's 9-digit MMSI; look it up on VesselFinder or MarineTraffic).

## Whale lamp (`/api/lamp`, LIFX bulb)

When orcas get within about **45 minutes** of the nearest watching spot, Richmond Beach to Lincoln Park (or are already in view of one), a LIFX color bulb turns **blue for 45 minutes**, then goes back to exactly what it was showing before (color, white temperature and brightness, e.g. the LIFX "Natural" white). The same orcas won't light it up again; new orcas after an hour of quiet will.

How it works: [cron-job.org](https://cron-job.org) (free) calls `/api/lamp?key=…` every minute. The function reads `/api/alert`, checks the bulb, and only changes it when needed. The bulb's previous setting and the 45-minute timer are kept in a small Redis store (free Upstash plan; only touched during alerts). If someone switches the lamp off while it's blue, it stays off; if someone changes its color, it's left alone. Normal use with Google Home or the LIFX app is never overridden. The rules are in `LAMP_CONFIG` in `src/lib/lamp.ts`.

Setup:
1. Set up the LIFX Color bulb in the LIFX app (any name, e.g. "Japandi lamp").
2. Create a personal access token at cloud.lifx.com (Settings → Personal access tokens).
3. In Vercel → Storage, create a free **Upstash for Redis** database and connect it to this project (this adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`).
4. In Vercel → Settings → Environment Variables add `LIFX_TOKEN` (the token), `LAMP_SECRET` (any long random text), and `LIFX_SELECTOR` (e.g. `label:Japandi lamp`; default is all LIFX bulbs). Redeploy.
5. At cron-job.org create a job that calls `https://<your-site>/api/lamp?key=<LAMP_SECRET>` every minute.

**"Back to Natural" button:** the lamp icon in the website's header opens a small window where, with the password in `LAMP_PASSWORD`, anyone in the house can end the blue early (`POST /api/lamp`). The same orcas won't turn it blue again. After 10 wrong passwords in an hour it stops accepting tries for that hour. The password can be remembered on each device.

Brief outages at LIFX, the lamp's memory or the sightings feed are skipped quietly (the answer says `"skipped": true` and the next minute tries again); a real problem, like a revoked LIFX token, still shows as a failed check in cron-job.org. Every check finishes within about 25 seconds, under cron-job.org's 30-second limit.

Test it with `&test=blue` (blue now; add `&minutes=2` for a short hold) and `&test=normal` (back to normal now). The page it returns says what the lamp did, or what went wrong.

## Environment variables

Set these in Vercel → Project → Settings → Environment Variables. See `.env.example`.

| Name | Required | What it's for |
| --- | --- | --- |
| `ACARTIA_TOKEN` | No | Acartia API token, only if Acartia starts requiring one |
| `AISSTREAM_API_KEY` | For boats | Free API key from aisstream.io |
| `LIFX_TOKEN` | For the lamp | LIFX personal access token |
| `LAMP_SECRET` | For the lamp | Any long random text; the scheduler sends it as `?key=` |
| `LAMP_PASSWORD` | For the lamp button | Password for the website's "Back to Natural" button |
| `LIFX_SELECTOR` | No | Which bulb(s), e.g. `label:Japandi lamp` (default: all) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | For the lamp | Upstash Redis (added automatically when connected in Vercel → Storage) |
| `VITE_MAP_STYLE_URL` | No | Map style. Defaults to OpenFreeMap "liberty" (free, no key) |

## Project structure

```
api/sightings.ts                 # Vercel function that proxies Acartia
api/alert.ts                     # Vercel function: Seattle orca alert for a lamp
public/whale.svg                 # favicon
src/
├── api/acartia.ts               # fetch + normalize sightings, sample-data fallback
├── api/orcasound.ts             # hydrophones, whale-sound reports, live stream URLs
├── components/
│   ├── Map.tsx                  # MapLibre map and markers
│   ├── SightingsList.tsx        # recent sightings
│   ├── SightingDetail.tsx       # one sighting
│   ├── PodGuide.tsx             # "Meet the pods"
│   ├── ListenPanel.tsx          # "Listen live" hydrophones
│   ├── PodBadges.tsx, OrcaIcon.tsx
├── data/demoSightings.ts        # sample sightings
├── hooks/useSightings.ts        # TanStack Query (auto-refresh)
├── hooks/useHydrophones.ts, useLiveAudio.ts
├── lib/alert.ts                 # "orcas approaching Seattle" logic (banner + /api/alert)
├── lib/sightings.ts             # parse Acartia records
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
