# Skyrail M1 — Planes Over London: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship M1 of Skyrail — a dark full-bleed MapLibre web app, centered on London, that renders live planes from OpenSky with smooth dead-reckoning animation between 10-second polls, and a basic click-to-detail card.

**Architecture:** Static Vite + React + TypeScript SPA. OpenSky `/states/all` is polled every 10s with a viewport bounding box. A Zustand store holds plane state keyed by `icao24`. MapLibre renders a WebGL symbol layer whose GeoJSON source is rewritten every animation frame by a `requestAnimationFrame` loop that dead-reckons each plane's position from heading and velocity. Clicking a plane marker selects it; the detail card reads the selected plane from the store.

**Tech Stack:** Vite 5, React 18, TypeScript 5, MapLibre GL 4, Zustand 4, Tailwind CSS 3, Vitest 2.

---

## Files created in this plan

Project config:
- `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`, `tailwind.config.ts`, `postcss.config.cjs`, `index.html`, `.gitignore`

Source:
- `src/main.tsx` — React entry
- `src/App.tsx` — top-level component, wires map + layer + polling + card
- `src/index.css` — Tailwind directives + base reset
- `src/config.ts` — constants (home location, poll interval, OpenSky URL)
- `src/util/bbox.ts` — viewport → OpenSky bbox type and converter
- `src/map/style.ts` — MapLibre style spec (dark CARTO tiles)
- `src/map/Map.tsx` — MapLibre wrapper component, publishes bbox changes
- `src/planes/types.ts` — `PlaneState` interface
- `src/planes/opensky.ts` — `fetchPlanes(bbox)` API client
- `src/planes/store.ts` — Zustand slice for planes + selection
- `src/planes/deadReckon.ts` — pure position-extrapolation math
- `src/planes/usePlanePolling.ts` — polling hook
- `src/planes/PlaneLayer.tsx` — map layer manager + RAF render loop
- `src/planes/PlaneDetailCard.tsx` — selected-plane detail UI

Tests:
- `tests/util/bbox.test.ts`
- `tests/planes/opensky.test.ts`
- `tests/planes/store.test.ts`
- `tests/planes/deadReckon.test.ts`

---

## Task 1: Project scaffolding

Manual scaffold — no interactive CLI. Creates all config and an empty-but-runnable React shell.

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.cjs`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`

- [ ] **Step 1: Write `.gitignore`**

```
node_modules
dist
.env
.env.local
*.log
.DS_Store

# Local Claude Code instructions — never commit
CLAUDE.md
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "skyrail",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "maplibre-gl": "^4.7.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals"]
  },
  "include": ["src", "tests"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: Write `tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 5: Write `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});
```

- [ ] **Step 6: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom'
  }
});
```

- [ ] **Step 7: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
};

export default config;
```

- [ ] **Step 8: Write `postcss.config.cjs`**

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
```

- [ ] **Step 9: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Skyrail</title>
  </head>
  <body class="bg-black text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 10: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root {
  height: 100%;
  margin: 0;
}

body {
  font-family: system-ui, -apple-system, sans-serif;
}
```

- [ ] **Step 11: Write `src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 12: Write `src/App.tsx` (placeholder — will be rewritten in Task 12)**

```tsx
export default function App() {
  return <div className="w-full h-full grid place-items-center">Skyrail</div>;
}
```

- [ ] **Step 13: Install dependencies**

Run: `npm install`
Expected: installs cleanly, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 14: Verify dev server starts**

Run: `npm run dev` (kill with Ctrl+C after verifying).
Expected: Vite prints "Local: http://localhost:5173/" without errors.

- [ ] **Step 15: Verify typecheck passes**

Run: `npm run typecheck`
Expected: no output (clean pass).

- [ ] **Step 16: Verify test runner loads**

Run: `npm test`
Expected: "No test files found" — correct, we haven't written any yet.

- [ ] **Step 17: Commit**

```bash
git add .
git commit -m "Scaffold Vite + React + Tailwind + Vitest for Skyrail"
```

---

## Task 2: Configuration constants

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Write `src/config.ts`**

```ts
export const OPENSKY_URL = 'https://opensky-network.org/api/states/all';

export const POLL_INTERVAL_MS = 10_000;

export const HOME = {
  lat: 51.5074,
  lon: -0.1278,
  label: 'London'
} as const;

export const MAP_INITIAL_ZOOM = 9;
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "Add configuration constants"
```

---

## Task 3: Viewport-to-bbox helper (TDD)

Converts a map viewport (SW + NE corners) to the `{lamin, lomin, lamax, lomax}` shape OpenSky expects.

**Files:**
- Create: `tests/util/bbox.test.ts`
- Create: `src/util/bbox.ts`

- [ ] **Step 1: Write failing test `tests/util/bbox.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { viewportToBbox } from '../../src/util/bbox';

describe('viewportToBbox', () => {
  it('returns opensky-style bbox from two corners', () => {
    const bbox = viewportToBbox({
      sw: { lat: 51.0, lon: -1.0 },
      ne: { lat: 52.0, lon: 1.0 }
    });
    expect(bbox).toEqual({
      lamin: 51.0,
      lomin: -1.0,
      lamax: 52.0,
      lomax: 1.0
    });
  });

  it('throws if sw is north of ne', () => {
    expect(() =>
      viewportToBbox({
        sw: { lat: 52.0, lon: -1.0 },
        ne: { lat: 51.0, lon: 1.0 }
      })
    ).toThrow(/inverted/);
  });

  it('throws if sw is east of ne', () => {
    expect(() =>
      viewportToBbox({
        sw: { lat: 51.0, lon: 2.0 },
        ne: { lat: 52.0, lon: 1.0 }
      })
    ).toThrow(/inverted/);
  });
});
```

- [ ] **Step 2: Run the test, confirm failure**

Run: `npm test -- tests/util/bbox.test.ts`
Expected: FAIL with "Cannot find module '../../src/util/bbox'".

- [ ] **Step 3: Write implementation `src/util/bbox.ts`**

```ts
export type LngLat = { lat: number; lon: number };
export type Viewport = { sw: LngLat; ne: LngLat };
export type OpenSkyBbox = {
  lamin: number;
  lomin: number;
  lamax: number;
  lomax: number;
};

export function viewportToBbox(viewport: Viewport): OpenSkyBbox {
  if (viewport.sw.lat > viewport.ne.lat || viewport.sw.lon > viewport.ne.lon) {
    throw new Error('Viewport is inverted: sw must be south and west of ne');
  }
  return {
    lamin: viewport.sw.lat,
    lomin: viewport.sw.lon,
    lamax: viewport.ne.lat,
    lomax: viewport.ne.lon
  };
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- tests/util/bbox.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/util/bbox.ts tests/util/bbox.test.ts
git commit -m "Add viewportToBbox helper"
```

---

## Task 4: PlaneState type

**Files:**
- Create: `src/planes/types.ts`

No tests — this file is a single type alias used by the other modules.

- [ ] **Step 1: Write `src/planes/types.ts`**

```ts
export type PlaneState = {
  icao24: string;
  callsign: string | null;
  origin_country: string;
  lat: number;
  lon: number;
  altitude_m: number | null;
  velocity_mps: number | null;
  heading_deg: number | null;
  vertical_rate_mps: number | null;
  on_ground: boolean;
  last_contact: number;     // unix seconds (from OpenSky)
  last_seen_local: number;  // ms timestamp (client clock) when this record was received
};
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/planes/types.ts
git commit -m "Add PlaneState type"
```

---

## Task 5: OpenSky API client (TDD)

Fetches planes in a bbox. Parses the OpenSky tuple-of-arrays response into `PlaneState[]`, dropping states with null lat/lon.

**OpenSky state tuple indices (v2):**
- 0: icao24 (string)
- 1: callsign (string, whitespace-padded)
- 2: origin_country (string)
- 3: time_position (number | null)
- 4: last_contact (number)
- 5: longitude (number | null)
- 6: latitude (number | null)
- 7: baro_altitude (number | null, m)
- 8: on_ground (boolean)
- 9: velocity (number | null, m/s)
- 10: true_track (number | null, deg)
- 11: vertical_rate (number | null, m/s)
- 12–16: not used in M1

**Files:**
- Create: `tests/planes/opensky.test.ts`
- Create: `src/planes/opensky.ts`

- [ ] **Step 1: Write failing test `tests/planes/opensky.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPlanes } from '../../src/planes/opensky';

describe('fetchPlanes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('parses OpenSky response into PlaneState[]', async () => {
    const sample = {
      time: 1_700_000_000,
      states: [
        [
          'abc123',
          'BAW117  ',
          'United Kingdom',
          1_700_000_000,
          1_700_000_000,
          -0.4,   // lon
          51.47,  // lat
          11_000, // baro_altitude
          false,  // on_ground
          250,    // velocity
          90,     // heading
          0,      // vertical_rate
          null, null, null, null, 0
        ]
      ]
    };

    const mockNow = 1_700_000_123_000;
    vi.spyOn(Date, 'now').mockReturnValue(mockNow);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(sample)
      })
    );

    const bbox = { lamin: 51, lomin: -1, lamax: 52, lomax: 1 };
    const result = await fetchPlanes(bbox);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      icao24: 'abc123',
      callsign: 'BAW117',
      origin_country: 'United Kingdom',
      lat: 51.47,
      lon: -0.4,
      altitude_m: 11_000,
      velocity_mps: 250,
      heading_deg: 90,
      vertical_rate_mps: 0,
      on_ground: false,
      last_contact: 1_700_000_000,
      last_seen_local: mockNow
    });
  });

  it('filters out states with null lat or lon', async () => {
    const sample = {
      time: 0,
      states: [
        ['a', 'x', 'x', 0, 0, null, null, null, false, null, null, null, null, null, null, null, 0],
        ['b', 'y', 'y', 0, 0, -0.1, 51.5, 100, false, 50, 45, 0, null, null, null, null, 0]
      ]
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(sample) })
    );
    const result = await fetchPlanes({ lamin: 0, lomin: 0, lamax: 1, lomax: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].icao24).toBe('b');
  });

  it('returns [] when states is null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ time: 0, states: null })
      })
    );
    const result = await fetchPlanes({ lamin: 0, lomin: 0, lamax: 1, lomax: 1 });
    expect(result).toEqual([]);
  });

  it('throws on non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 503, statusText: 'Service Unavailable' })
    );
    await expect(
      fetchPlanes({ lamin: 0, lomin: 0, lamax: 1, lomax: 1 })
    ).rejects.toThrow(/503/);
  });

  it('includes bbox query params in the URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ time: 0, states: null })
    });
    vi.stubGlobal('fetch', fetchMock);

    await fetchPlanes({ lamin: 1, lomin: 2, lamax: 3, lomax: 4 });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('lamin=1');
    expect(calledUrl).toContain('lomin=2');
    expect(calledUrl).toContain('lamax=3');
    expect(calledUrl).toContain('lomax=4');
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- tests/planes/opensky.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write implementation `src/planes/opensky.ts`**

```ts
import { OPENSKY_URL } from '../config';
import type { OpenSkyBbox } from '../util/bbox';
import type { PlaneState } from './types';

type OpenSkyResponse = {
  time: number;
  states: Array<Array<string | number | boolean | null>> | null;
};

export async function fetchPlanes(bbox: OpenSkyBbox): Promise<PlaneState[]> {
  const params = new URLSearchParams({
    lamin: String(bbox.lamin),
    lomin: String(bbox.lomin),
    lamax: String(bbox.lamax),
    lomax: String(bbox.lomax)
  });

  const res = await fetch(`${OPENSKY_URL}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`OpenSky fetch failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as OpenSkyResponse;
  if (!body.states) return [];

  const now = Date.now();
  const planes: PlaneState[] = [];
  for (const s of body.states) {
    const lon = s[5] as number | null;
    const lat = s[6] as number | null;
    if (lat === null || lon === null) continue;

    const rawCall = s[1];
    const callsign =
      typeof rawCall === 'string' && rawCall.trim().length > 0 ? rawCall.trim() : null;

    planes.push({
      icao24: s[0] as string,
      callsign,
      origin_country: (s[2] as string) ?? '',
      lat,
      lon,
      altitude_m: s[7] as number | null,
      on_ground: (s[8] as boolean) ?? false,
      velocity_mps: s[9] as number | null,
      heading_deg: s[10] as number | null,
      vertical_rate_mps: s[11] as number | null,
      last_contact: (s[4] as number) ?? 0,
      last_seen_local: now
    });
  }
  return planes;
}
```

- [ ] **Step 4: Run tests, confirm all pass**

Run: `npm test -- tests/planes/opensky.test.ts`
Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/planes/opensky.ts tests/planes/opensky.test.ts
git commit -m "Add OpenSky fetch client with response parsing"
```

---

## Task 6: Zustand plane store (TDD)

Keyed by `icao24`. Exposes `setPlanes(list)` (full replacement each poll), `selectPlane(id | null)`, and `reset()` for tests.

**Files:**
- Create: `tests/planes/store.test.ts`
- Create: `src/planes/store.ts`

- [ ] **Step 1: Write failing test `tests/planes/store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { usePlaneStore } from '../../src/planes/store';
import type { PlaneState } from '../../src/planes/types';

const make = (icao: string, lat = 51.5, lon = -0.1): PlaneState => ({
  icao24: icao,
  callsign: `CS${icao}`,
  origin_country: 'x',
  lat,
  lon,
  altitude_m: 10_000,
  velocity_mps: 200,
  heading_deg: 90,
  vertical_rate_mps: 0,
  on_ground: false,
  last_contact: 0,
  last_seen_local: 0
});

describe('usePlaneStore', () => {
  beforeEach(() => {
    usePlaneStore.getState().reset();
  });

  it('starts empty', () => {
    expect(usePlaneStore.getState().planes).toEqual({});
    expect(usePlaneStore.getState().selectedIcao24).toBeNull();
  });

  it('setPlanes replaces the plane map, keyed by icao24', () => {
    usePlaneStore.getState().setPlanes([make('a'), make('b')]);
    expect(Object.keys(usePlaneStore.getState().planes).sort()).toEqual(['a', 'b']);
    usePlaneStore.getState().setPlanes([make('c')]);
    expect(Object.keys(usePlaneStore.getState().planes)).toEqual(['c']);
  });

  it('selectPlane stores selected icao24 and accepts null to clear', () => {
    usePlaneStore.getState().selectPlane('abc');
    expect(usePlaneStore.getState().selectedIcao24).toBe('abc');
    usePlaneStore.getState().selectPlane(null);
    expect(usePlaneStore.getState().selectedIcao24).toBeNull();
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- tests/planes/store.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write implementation `src/planes/store.ts`**

```ts
import { create } from 'zustand';
import type { PlaneState } from './types';

type PlaneStore = {
  planes: Record<string, PlaneState>;
  selectedIcao24: string | null;
  setPlanes: (list: PlaneState[]) => void;
  selectPlane: (icao24: string | null) => void;
  reset: () => void;
};

export const usePlaneStore = create<PlaneStore>((set) => ({
  planes: {},
  selectedIcao24: null,
  setPlanes: (list) => {
    const next: Record<string, PlaneState> = {};
    for (const p of list) next[p.icao24] = p;
    set({ planes: next });
  },
  selectPlane: (icao24) => set({ selectedIcao24: icao24 }),
  reset: () => set({ planes: {}, selectedIcao24: null })
}));
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- tests/planes/store.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/planes/store.ts tests/planes/store.test.ts
git commit -m "Add Zustand plane store with selection state"
```

---

## Task 7: Dead-reckoning math (TDD)

Pure function: given a `PlaneState` and a positive `deltaMs`, return `{lat, lon}` extrapolated along its current heading at its known velocity. Uses the equirectangular approximation (accurate at the ~10s / ~2.5km scale we poll at).

- `distance_m = velocity_mps * (deltaMs / 1000)`
- `deltaLat = distance_m * cos(heading_rad) / 111_320`
- `deltaLon = distance_m * sin(heading_rad) / (111_320 * cos(lat_rad))`

Returns the original position unchanged when `velocity_mps` or `heading_deg` is null, or when `deltaMs <= 0`.

**Files:**
- Create: `tests/planes/deadReckon.test.ts`
- Create: `src/planes/deadReckon.ts`

- [ ] **Step 1: Write failing test `tests/planes/deadReckon.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { deadReckon } from '../../src/planes/deadReckon';
import type { PlaneState } from '../../src/planes/types';

const plane = (partial: Partial<PlaneState> = {}): PlaneState => ({
  icao24: 'x',
  callsign: null,
  origin_country: '',
  lat: 51.5,
  lon: 0,
  altitude_m: 10_000,
  velocity_mps: 250,
  heading_deg: 90,
  vertical_rate_mps: 0,
  on_ground: false,
  last_contact: 0,
  last_seen_local: 0,
  ...partial
});

describe('deadReckon', () => {
  it('returns original position when delta is 0', () => {
    expect(deadReckon(plane(), 0)).toEqual({ lat: 51.5, lon: 0 });
  });

  it('returns original position when velocity is null', () => {
    expect(deadReckon(plane({ velocity_mps: null }), 10_000)).toEqual({ lat: 51.5, lon: 0 });
  });

  it('returns original position when heading is null', () => {
    expect(deadReckon(plane({ heading_deg: null }), 10_000)).toEqual({ lat: 51.5, lon: 0 });
  });

  it('moves east when heading is 90', () => {
    const p = plane({ velocity_mps: 250, heading_deg: 90 });
    const result = deadReckon(p, 10_000);
    // ~2500 m east. At lat 51.5, 1 deg lon ≈ 69,404 m, so ≈ 0.036 deg.
    expect(result.lat).toBeCloseTo(51.5, 4);
    expect(result.lon).toBeGreaterThan(0);
    expect(result.lon).toBeCloseTo(0.036, 3);
  });

  it('moves north when heading is 0', () => {
    const p = plane({ velocity_mps: 1000, heading_deg: 0 });
    const result = deadReckon(p, 1_000);
    // 1000 m north / 111_320 ≈ 0.00898 deg
    expect(result.lon).toBeCloseTo(0, 5);
    expect(result.lat).toBeCloseTo(51.5 + 0.00898, 4);
  });

  it('is pure (does not mutate input)', () => {
    const p = plane();
    deadReckon(p, 10_000);
    expect(p.lat).toBe(51.5);
    expect(p.lon).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, confirm failure**

Run: `npm test -- tests/planes/deadReckon.test.ts`
Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Write implementation `src/planes/deadReckon.ts`**

```ts
import type { PlaneState } from './types';

const METERS_PER_DEG_LAT = 111_320;

export function deadReckon(
  plane: PlaneState,
  deltaMs: number
): { lat: number; lon: number } {
  if (deltaMs <= 0 || plane.velocity_mps == null || plane.heading_deg == null) {
    return { lat: plane.lat, lon: plane.lon };
  }

  const distance_m = plane.velocity_mps * (deltaMs / 1000);
  const headingRad = (plane.heading_deg * Math.PI) / 180;
  const latRad = (plane.lat * Math.PI) / 180;

  const deltaLat = (distance_m * Math.cos(headingRad)) / METERS_PER_DEG_LAT;
  const deltaLon =
    (distance_m * Math.sin(headingRad)) / (METERS_PER_DEG_LAT * Math.cos(latRad));

  return {
    lat: plane.lat + deltaLat,
    lon: plane.lon + deltaLon
  };
}
```

- [ ] **Step 4: Run tests, confirm pass**

Run: `npm test -- tests/planes/deadReckon.test.ts`
Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/planes/deadReckon.ts tests/planes/deadReckon.test.ts
git commit -m "Add deadReckon helper for plane position extrapolation"
```

---

## Task 8: Polling hook

A hook that polls OpenSky on an interval when a bbox is provided. Writes results to the store. Re-subscribes when bbox values change. Cancels cleanly on unmount.

**Files:**
- Create: `src/planes/usePlanePolling.ts`

This is a thin coordination layer over functions we've already tested; no unit test needed. Manual verification happens in Task 12.

- [ ] **Step 1: Write `src/planes/usePlanePolling.ts`**

```ts
import { useEffect, useRef } from 'react';
import { POLL_INTERVAL_MS } from '../config';
import type { OpenSkyBbox } from '../util/bbox';
import { fetchPlanes } from './opensky';
import { usePlaneStore } from './store';

export function usePlanePolling(bbox: OpenSkyBbox | null) {
  const bboxRef = useRef(bbox);
  bboxRef.current = bbox;

  useEffect(() => {
    if (!bbox) return;
    let cancelled = false;

    const poll = async () => {
      const current = bboxRef.current;
      if (!current) return;
      try {
        const planes = await fetchPlanes(current);
        if (!cancelled) usePlaneStore.getState().setPlanes(planes);
      } catch (err) {
        console.error('OpenSky poll failed:', err);
      }
    };

    poll();
    const handle = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [bbox?.lamin, bbox?.lomin, bbox?.lamax, bbox?.lomax]);
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/planes/usePlanePolling.ts
git commit -m "Add usePlanePolling hook"
```

---

## Task 9: MapLibre map component

Mounts MapLibre, centers it on London, and calls `onBboxChange` on `load` and every `moveend`. Renders children (render-prop) only once the map instance is ready.

**Files:**
- Create: `src/map/style.ts`
- Create: `src/map/Map.tsx`

- [ ] **Step 1: Write `src/map/style.ts`**

Uses CARTO's free dark raster tiles (no token, OSM-attributed).

```ts
import type { StyleSpecification } from 'maplibre-gl';

export const darkStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>'
    }
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
};
```

- [ ] **Step 2: Write `src/map/Map.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { HOME, MAP_INITIAL_ZOOM } from '../config';
import { darkStyle } from './style';
import type { OpenSkyBbox } from '../util/bbox';
import { viewportToBbox } from '../util/bbox';

type MapProps = {
  onBboxChange: (bbox: OpenSkyBbox) => void;
  children?: (map: MLMap) => React.ReactNode;
};

export function Map({ onBboxChange, children }: MapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MLMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const m = new maplibregl.Map({
      container: containerRef.current,
      style: darkStyle,
      center: [HOME.lon, HOME.lat],
      zoom: MAP_INITIAL_ZOOM
    });

    const publishBbox = () => {
      const b = m.getBounds();
      onBboxChange(
        viewportToBbox({
          sw: { lat: b.getSouth(), lon: b.getWest() },
          ne: { lat: b.getNorth(), lon: b.getEast() }
        })
      );
    };

    m.on('load', () => {
      publishBbox();
      setMap(m);
    });
    m.on('moveend', publishBbox);

    return () => {
      m.remove();
    };
  }, [onBboxChange]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {map && children?.(map)}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/map/Map.tsx src/map/style.ts
git commit -m "Add MapLibre map component with dark tiles"
```

---

## Task 10: Plane rendering layer + RAF animation loop

Mounts a GeoJSON source + symbol layer on the provided map. On every animation frame, reads planes from the store, dead-reckons each one's current position, and pushes a fresh `FeatureCollection` to the source. Clicking a plane symbol calls `selectPlane` on the store.

**Files:**
- Create: `src/planes/PlaneLayer.tsx`

- [ ] **Step 1: Write `src/planes/PlaneLayer.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import type { Map as MLMap, GeoJSONSource } from 'maplibre-gl';
import { usePlaneStore } from './store';
import { deadReckon } from './deadReckon';

const SOURCE_ID = 'planes';
const LAYER_ID = 'planes-symbol';
const ICON_ID = 'plane-icon';

// White triangle pointing north (heading 0). Rotated per-feature by MapLibre.
const PLANE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2 L18 20 L12 17 L6 20 Z" fill="white" stroke="black" stroke-width="1" />
</svg>`.trim();

function svgToImage(svg: string): Promise<HTMLImageElement> {
  const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function PlaneLayer({ map }: { map: MLMap }) {
  const rafRef = useRef<number | null>(null);

  // One-time layer + icon setup.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const img = await svgToImage(PLANE_SVG);
      if (cancelled) return;
      if (!map.hasImage(ICON_ID)) map.addImage(ICON_ID, img);

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'icon-image': ICON_ID,
            'icon-size': 0.8,
            'icon-rotate': ['coalesce', ['get', 'heading'], 0],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });
      }

      map.on('click', LAYER_ID, (e) => {
        const feature = e.features?.[0];
        const icao = feature?.properties?.icao24 as string | undefined;
        if (icao) usePlaneStore.getState().selectPlane(icao);
      });
      map.on('mouseenter', LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', LAYER_ID, () => {
        map.getCanvas().style.cursor = '';
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [map]);

  // RAF loop: compute dead-reckoned positions and push to the GeoJSON source.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const planes = Object.values(usePlaneStore.getState().planes);
      const features = planes.map((p) => {
        const dt = now - p.last_seen_local;
        const pos = deadReckon(p, dt);
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [pos.lon, pos.lat]
          },
          properties: {
            icao24: p.icao24,
            callsign: p.callsign ?? '',
            heading: p.heading_deg ?? 0
          }
        };
      });

      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [map]);

  return null;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/planes/PlaneLayer.tsx
git commit -m "Render planes on map with dead-reckoning RAF loop"
```

---

## Task 11: Plane detail card

Reads the selected plane from the store. If nothing selected, renders nothing. Shows callsign, origin country, ICAO24, altitude (ft) and speed (kt), with a close button.

**Files:**
- Create: `src/planes/PlaneDetailCard.tsx`

- [ ] **Step 1: Write `src/planes/PlaneDetailCard.tsx`**

```tsx
import { usePlaneStore } from './store';

export function PlaneDetailCard() {
  const selected = usePlaneStore((s) =>
    s.selectedIcao24 ? s.planes[s.selectedIcao24] : null
  );
  const close = usePlaneStore((s) => s.selectPlane);

  if (!selected) return null;

  const altFt =
    selected.altitude_m != null
      ? Math.round(selected.altitude_m * 3.28084).toLocaleString()
      : '—';
  const speedKt =
    selected.velocity_mps != null ? Math.round(selected.velocity_mps * 1.94384) : '—';

  return (
    <div className="absolute top-4 right-4 w-72 bg-black/80 text-white backdrop-blur border border-white/20 rounded-lg p-4 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-white/50">Callsign</div>
          <div className="text-lg font-semibold">
            {selected.callsign || selected.icao24}
          </div>
        </div>
        <button
          onClick={() => close(null)}
          className="text-white/50 hover:text-white text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-white/50 text-xs">Origin country</div>
          <div>{selected.origin_country || '—'}</div>
        </div>
        <div>
          <div className="text-white/50 text-xs">ICAO24</div>
          <div className="font-mono">{selected.icao24}</div>
        </div>
        <div>
          <div className="text-white/50 text-xs">Altitude</div>
          <div>{altFt} ft</div>
        </div>
        <div>
          <div className="text-white/50 text-xs">Speed</div>
          <div>{speedKt} kt</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/planes/PlaneDetailCard.tsx
git commit -m "Add plane detail card UI"
```

---

## Task 12: Wire App.tsx, then run the thing end-to-end

**Files:**
- Modify: `src/App.tsx` (full rewrite)

- [ ] **Step 1: Replace `src/App.tsx` with:**

```tsx
import { useState } from 'react';
import { Map } from './map/Map';
import { PlaneLayer } from './planes/PlaneLayer';
import { PlaneDetailCard } from './planes/PlaneDetailCard';
import { usePlanePolling } from './planes/usePlanePolling';
import type { OpenSkyBbox } from './util/bbox';

export default function App() {
  const [bbox, setBbox] = useState<OpenSkyBbox | null>(null);
  usePlanePolling(bbox);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <Map onBboxChange={setBbox}>
        {(map) => <PlaneLayer map={map} />}
      </Map>
      <PlaneDetailCard />
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: clean.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all tests pass (3 + 5 + 3 + 6 = 17 across 4 files).

- [ ] **Step 4: Start the dev server**

Run: `npm run dev`
Expected: Vite serves on http://localhost:5173.

- [ ] **Step 5: Browser smoke check**

Open http://localhost:5173 in a browser.

Verify:
- Dark map centered on London.
- Within ~10 seconds, small white triangles appear at plane positions.
- Triangles animate smoothly between polls (the RAF dead-reckoning).
- Triangle orientation roughly matches each plane's heading (cross-check against a known flight on FlightRadar24 if unsure).
- Clicking a triangle opens the detail card with callsign + altitude + speed.
- Close (×) button dismisses the card.
- Panning the map triggers a new `/states/all` request in the Network tab with updated `lamin`/`lamax`.

**If the OpenSky request is blocked by CORS**, add a Cloudflare Worker proxy. That's a separate follow-up task; stop here and raise it.

**If planes appear but don't move smoothly**, check the Console for RAF errors and verify `last_seen_local` is being set to a sane epoch ms value (huge/zero values will cause huge position jumps).

- [ ] **Step 6: Stop the dev server and commit**

Ctrl+C to stop Vite, then:

```bash
git add src/App.tsx
git commit -m "Wire map, plane layer, polling, and detail card into App"
```

---

## Task 13: Soak test + M1 sign-off

No code changes — just validating the milestone behaves under realistic use.

- [ ] **Step 1: Re-run dev server**

Run: `npm run dev`

- [ ] **Step 2: Leave the tab open for 5 minutes**

Expected: planes continue updating every ~10s, no console errors, no memory growth visible in DevTools Performance tab.

- [ ] **Step 3: Pan the map over mainland Europe**

Expected: within 10s, a new set of planes appears for the new region.

- [ ] **Step 4: Stop the dev server**

- [ ] **Step 5: Tag M1**

```bash
git tag -a m1 -m "M1: planes over London"
```

M1 is complete when all steps above pass.

---

## Out of scope for this plan (deferred to later milestones)

- Spotter log, "I spotted this" button, and watchlist rules (M2).
- Aircraft-type codex and Wikipedia enrichment of the detail card (M3).
- Train rendering of any kind (M4 and M5).
- Cloud-cover visibility badge and settings UI (M6).
- Deploy to Cloudflare Pages (M6).
- Any CORS proxy — only added if Task 12 Step 5 reveals OpenSky blocks browser calls in practice.
