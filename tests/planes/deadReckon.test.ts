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
    expect(result.lat).toBeCloseTo(51.5, 4);
    expect(result.lon).toBeGreaterThan(0);
    expect(result.lon).toBeCloseTo(0.036, 3);
  });

  it('moves north when heading is 0', () => {
    const p = plane({ velocity_mps: 1000, heading_deg: 0 });
    const result = deadReckon(p, 1_000);
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
