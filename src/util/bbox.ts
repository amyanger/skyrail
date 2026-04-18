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
