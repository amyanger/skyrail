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
