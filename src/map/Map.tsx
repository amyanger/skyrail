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
