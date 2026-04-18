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
