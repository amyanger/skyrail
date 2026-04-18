import { OPENSKY_URL } from '../config';
import type { OpenSkyBbox } from '../util/bbox';
import type { PlaneState } from './types';

type OpenSkyResponse = {
  time: number;
  states: Array<Array<string | number | boolean | null>> | null;
};

export async function fetchPlanes(
  bbox: OpenSkyBbox,
  signal?: AbortSignal
): Promise<PlaneState[]> {
  const params = new URLSearchParams({
    lamin: String(bbox.lamin),
    lomin: String(bbox.lomin),
    lamax: String(bbox.lamax),
    lomax: String(bbox.lomax)
  });

  const res = await fetch(`${OPENSKY_URL}?${params.toString()}`, { signal });
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
