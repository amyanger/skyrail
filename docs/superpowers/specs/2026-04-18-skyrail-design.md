# Skyrail — Design Document

**Date:** 2026-04-18
**Status:** Draft — awaiting final review

---

## Vision

A web app that shows live plane and train movements on a single dark, full-bleed map — a "living window" you can leave open on a second monitor. Layered on top of the ambient view is a lightweight spotter toolset: watchlists that alert when specific aircraft or trains enter your area, and a personal log for recording what you've seen.

Built for a solo user based in London. No accounts, no server-side database, no social features. All personal data lives in the browser.

## Goals

1. Render a smooth, real-time map of planes and trains with visible, continuous movement.
2. Support spotter workflows: watchlists with browser-notification alerts, a personal spotting log with notes.
3. Stay free to run. Use only public APIs that have a no-cost tier and no mandatory server infrastructure.
4. Be enjoyable the first time it loads. No onboarding wall, no sign-up.

## Non-goals (v1)

- Multi-user features, accounts, authentication, sharing, public leaderboards.
- Historical playback / time-scrubbing.
- Cross-device sync of personal data.
- Paid API integrations (UK National Rail mainline, ADS-B Exchange paid tier).
- Native mobile apps.
- Offline mode beyond basic PWA shell caching.

## User experience

### Default view

Full-bleed dark map centered on the user's home location (default: London). Planes and trains animate across it continuously. No chrome visible except a thin vertical strip along one edge with three icon buttons: **Alerts**, **Log**, **Settings**.

### Interaction model

- **Click a plane or train** → floating detail card appears.
  - Plane card: callsign, aircraft type (e.g. "Boeing 777-300ER"), operator, origin → destination, altitude, speed, a short Wikipedia blurb for notable types.
  - Train card: service name, operator, origin → destination, next stop, delay, current estimated position freshness.
  - Primary action on both: **I spotted this** — stamps the current timestamp and the user's home location, writes a SpotEntry to IndexedDB, and dismisses the card.
- **Alerts panel** — live stream of matches against active watchlists, newest at top.
- **Log panel** — reverse-chronological spotter diary, filterable by kind (plane/train), operator, aircraft type, or date range. Each entry expandable to show the snapshot captured at spot time plus the user's note.
- **Settings panel** — home location, pinned TfL stations, which layers are visible, watchlist management, map style.

### Pinned station board (optional, off by default)

A small overlaid panel showing live arrivals at a chosen London station, styled like a classic flip-split departure board. Driven by TfL's arrivals API.

### Visual honesty

Planes are drawn from observed positions (OpenSky ADS-B). Trains are rendered at *estimated* positions interpolated along rail geometry. Trains whose latest prediction is more than 60 seconds stale get a subtle dashed outline so the user can distinguish fresh from stale estimates.

## Architecture

### Stack

- **Vite + React + TypeScript** — build tool and UI framework.
- **MapLibre GL JS** — WebGL map. Base tiles from OpenStreetMap (token-free) or MapTiler (free tier, nicer styling).
- **Tailwind CSS** — styling.
- **Zustand** — in-memory state store (live plane/train state, UI state).
- **Dexie** — IndexedDB wrapper for persistent local data.

### Deployment

- **Cloudflare Pages** (or Vercel) for the static site.
- A reserved slot for a thin **Cloudflare Worker** proxy in case OpenSky or TfL block direct browser calls via CORS. Not built upfront — added only if required.

### Polling & animation

- **OpenSky `/states/all`** — polled every 10 seconds with a bounding-box query matching the current map viewport.
- **TfL arrivals / line-status** — polled every 30 seconds for pinned stations and visible London lines.
- **transport.rest** — polled on-demand when the European trains layer is visible.
- **AviationAPI / Wikipedia** — lazy-fetched only on plane click, results cached in a session map.
- **Open-Meteo** — polled once on load and every 30 minutes for a cloud-cover visibility badge.

Between polls, planes and trains are animated via a requestAnimationFrame loop:

- **Planes**: dead-reckoned from last known position using heading and velocity. When new data arrives, position smoothly interpolates to the corrected value over ~1s to prevent jumps.
- **Trains**: interpolated along cached rail geometry between known stops using the last arrival prediction, with the icon rotated to match the tangent of the polyline at its current position. Dwell at stations when applicable. Smooth corrections on new predictions.

### Data flow summary

```
OpenSky / TfL / transport.rest
  → fetch layer (rate-limited, bounding-box aware)
  → Zustand store (live state, one entry per tracked object)
  → MapLibre symbol layers (WebGL rendering)
  → requestAnimationFrame ticker (dead-reckoning + interpolation)

User clicks marker
  → enrichment fetch (AviationAPI / Wikipedia) — cached per ICAO/type
  → detail card UI
  → "I spotted this" → Dexie write → SpotEntry

Watchlist engine
  → on each poll, evaluate active rules against current live state
  → on first match, write to alerts stream + trigger browser notification if enabled
  → throttle so the same object doesn't re-alert within a cooldown window
```

## Data model

### Live state (Zustand, not persisted)

```ts
type PlaneState = {
  icao24: string;           // unique hex ID from OpenSky
  callsign: string | null;
  origin_country: string;
  lat: number;
  lon: number;
  altitude_m: number | null;
  velocity_mps: number | null;
  heading_deg: number | null;
  vertical_rate_mps: number | null;
  on_ground: boolean;
  last_contact: number;     // unix seconds from OpenSky
  last_seen_local: number;  // ms timestamp when client received it
  enrichment?: {
    type?: string;          // e.g. "Boeing 777-300ER"
    operator?: string;
    origin_airport?: string;
    dest_airport?: string;
    wiki_blurb?: string;
  };
};

type TrainState = {
  id: string;
  source: 'tfl' | 'transport-rest';
  operator: string;
  service_name: string;
  origin: string;
  destination: string;
  next_stop: string;
  next_stop_eta_local: number;
  delay_min: number;
  route_geometry_id: string;
  estimated_lat: number;
  estimated_lon: number;
  estimated_progress: number; // 0..1 along current segment
  last_refresh_local: number;
};
```

### Persisted state (Dexie / IndexedDB)

```ts
type Settings = {
  home_lat: number;
  home_lon: number;
  home_label: string;
  pinned_stations: string[];        // TfL station IDs
  visible_layers: {
    planes: boolean;
    trains_london: boolean;
    trains_europe: boolean;
  };
  map_style: 'dark' | 'satellite';
};

type WatchlistRule = {
  id: string;                        // uuid
  kind: 'plane' | 'train';
  label: string;
  criteria:
    | { type: 'aircraft_type'; values: string[] }
    | { type: 'operator'; values: string[] }
    | { type: 'registration'; values: string[] }
    | { type: 'icao24'; values: string[] }
    | { type: 'train_operator'; values: string[] }
    | { type: 'service_name'; pattern: string };
  region?: { lat: number; lon: number; radius_km: number };
  notify: boolean;
  last_triggered?: number;
};

type SpotEntry = {
  id: string;
  kind: 'plane' | 'train';
  spotted_at: number;
  spotted_from: { lat: number; lon: number; label: string };
  snapshot: PlaneState | TrainState;
  user_note?: string;
  tags?: string[];
};
```

### Bundled static assets

- **Rail geometry** — GeoJSON polylines for UK mainline + London Tube/Overground/Elizabeth line + major European routes. Sourced from OpenRailwayMap / OpenStreetMap extracts. Target size: ~1–2MB gzipped, loaded once and cached by the browser.
- **Aircraft type codex** — lookup table mapping ICAO aircraft type codes to human-readable names. Bundled so most plane detail cards work without any network call beyond OpenSky.

### Design notes on the model

- **Snapshots in SpotEntry** capture the state at spot time, not a live reference. The log is historical truth and survives upstream data changes.
- **Watchlist criteria are structured**, not free-text, so matching in the poll loop is a pure function with no regex-parsing overhead per tick.
- **Region is optional** on watchlist rules, allowing both global ("any A380 anywhere") and local ("any Eurostar within 20km of home") rules.
- **First-run UX requires no setup**: sensible defaults for home location and visible layers, no watchlists required to use the map.

## APIs and integration details

| API | Auth | Polling | Purpose |
|---|---|---|---|
| OpenSky Network `/states/all` | None | 10s, bbox | Live plane positions |
| AviationAPI | None | On-demand, cached | Airport metadata for route display |
| Wikipedia REST | None | On-demand, cached | Aircraft type blurbs |
| TfL Unified API | Free key | 30s | London train/tube arrivals + positions |
| transport.rest | None | 30s when layer visible | European train arrivals + routes |
| Open-Meteo | None | 30 min | Cloud cover visibility badge |

### Known risks

1. **OpenSky CORS** — anonymous browser access works at time of writing, but the project has tightened access before. Mitigation: Cloudflare Worker proxy, ~30 lines of code.
2. **OpenSky rate limits** — anonymous tier has tight caps on request frequency and bounding-box size. Mitigation: adjust poll cadence dynamically based on viewport size; consider a free registered API key which raises limits.
3. **TfL key embedding** — the free key is not a secret per se but should not be reused across users. For a solo app this is fine; if ever made public, move to Worker proxy.
4. **Train interpolation drift** — when a train is held between stations, the estimate keeps moving until the next prediction corrects it. Mitigated visually with stale-data indicator.
5. **Rail geometry completeness** — OpenStreetMap coverage is excellent for UK mainline + London and for major European corridors, but may have gaps. Acceptable for v1; trains on uncovered routes fall back to straight-line interpolation between stops with a debug badge.

## Build order

Six milestones, each ending in a demoable state.

### M1 — Planes over London

Scaffold Vite/React/Tailwind/Zustand/MapLibre. Dark map centered on London. OpenSky poll every 10s with viewport bounding box. Planes rendered and dead-reckoned. Basic click → detail card with callsign, altitude, speed. Hardcoded home location, no settings UI yet.

**End state:** a live plane map, already enjoyable to watch.

### M2 — Spotter log and watchlists

Dexie storage. "I spotted this" writes a SpotEntry. Log panel with filtering. Watchlist rule builder supporting aircraft_type / operator / registration criteria. Matching engine evaluates rules each poll with cooldown throttling. Browser Notifications API integration for rules with `notify: true`.

**End state:** logging and alerting loops work.

### M3 — Plane enrichment

Bundle aircraft type codex. On detail-card open, fetch operator + route via AviationAPI and Wikipedia blurb; cache per session. Rich cards, richer alert text.

**End state:** cards tell a story. Natural MVP release point — planes-only is a strong standalone product.

### M4 — London trains layer

TfL key integration. Arrivals panel for pinned stations in flip-split board style. Live train position interpolation for Tube, Elizabeth line, Overground using the rail geometry and TfL arrival predictions. Train detail card and spot-log integration.

**End state:** the London rail loop is closed.

### M5 — Europe trains layer

transport.rest integration. Eurostar, Deutsche Bahn, SBB, ÖBB, NS routes rendered. Cached European rail geometry loaded when the layer is enabled.

**End state:** continental ambient view.

### M6 — Polish and deploy

First-run onboarding (pick home location). Full settings panel. Open-Meteo cloud-cover visibility badge. Map style options. Icon set pass. Deploy to Cloudflare Pages on a custom URL.

**End state:** shippable v1.

## Open questions (to resolve during implementation)

- **Aircraft icon set** — custom SVGs, or a public set (e.g. flightradar-style wedges)? Affects visual identity.
- **MapTiler vs raw OpenStreetMap tiles** — MapTiler looks better but requires a free token; OSM is fully tokenless. Default to OSM for simplicity, revisit in M6.
- **Exact cooldown window for watchlist alerts** — probably 15 minutes per matched object, but needs user-testing.
- **Rail geometry sourcing pipeline** — a one-time script that extracts relevant OSM lines and converts to GeoJSON. Likely written as a small Node script in `scripts/` that checks output into `public/geometry/`.

## Success criteria

- The map opens and shows moving planes within 3 seconds on a warm cache.
- Plane positions appear smooth (no visible jumps) under normal OpenSky polling.
- Train positions visibly animate along correct rail geometry at the intended zoom levels.
- A new watchlist rule from scratch to first alert takes under 60 seconds of user time.
- Running the app in a background tab for an hour does not noticeably affect system performance.
