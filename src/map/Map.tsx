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

  // Route callback through a ref so the effect below can depend on [] only.
  const onBboxChangeRef = useRef(onBboxChange);
  useEffect(() => {
    onBboxChangeRef.current = onBboxChange;
  }, [onBboxChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const m = new maplibregl.Map({
      container: containerRef.current,
      style: darkStyle,
      center: [HOME.lon, HOME.lat],
      zoom: MAP_INITIAL_ZOOM
    });

    const publishBbox = () => {
      const b = m.getBounds();
      onBboxChangeRef.current(
        viewportToBbox({
          sw: { lat: b.getSouth(), lon: b.getWest() },
          ne: { lat: b.getNorth(), lon: b.getEast() }
        })
      );
    };

    m.on('load', () => {
      if (cancelled) return;
      publishBbox();
      setMap(m);
    });
    m.on('moveend', publishBbox);

    return () => {
      cancelled = true;
      m.remove();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {map && children?.(map)}
    </div>
  );
}
