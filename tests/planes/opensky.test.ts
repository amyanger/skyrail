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
