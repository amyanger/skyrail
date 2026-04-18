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
