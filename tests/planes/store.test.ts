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
