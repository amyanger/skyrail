import { useEffect, useRef } from 'react';
import type { Map as MLMap, GeoJSONSource, MapLayerMouseEvent } from 'maplibre-gl';
import { usePlaneStore } from './store';
import { deadReckon } from './deadReckon';

const SOURCE_ID = 'planes';
const LAYER_ID = 'planes-symbol';
const ICON_ID = 'plane-icon';
const MAX_DEAD_RECKON_MS = 30_000;

// White triangle pointing north (heading 0). Rotated per-feature by MapLibre.
const PLANE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M12 2 L18 20 L12 17 L6 20 Z" fill="white" stroke="black" stroke-width="1" />
</svg>`.trim();

function svgToImage(svg: string): Promise<HTMLImageElement> {
  const url = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

export function PlaneLayer({ map }: { map: MLMap }) {
  const rafRef = useRef<number | null>(null);

  // One-time layer + icon setup. Capture handler refs so we can remove them on unmount.
  useEffect(() => {
    let cancelled = false;

    const onClick = (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      const icao = feature?.properties?.icao24 as string | undefined;
      if (icao) usePlaneStore.getState().selectPlane(icao);
    };
    const onMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const onMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    let handlersAttached = false;

    (async () => {
      const img = await svgToImage(PLANE_SVG);
      if (cancelled) return;
      if (!map.hasImage(ICON_ID)) map.addImage(ICON_ID, img);

      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });
      }
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: 'symbol',
          source: SOURCE_ID,
          layout: {
            'icon-image': ICON_ID,
            'icon-size': 0.8,
            'icon-rotate': ['coalesce', ['get', 'heading'], 0],
            'icon-rotation-alignment': 'map',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });
      }

      map.on('click', LAYER_ID, onClick);
      map.on('mouseenter', LAYER_ID, onMouseEnter);
      map.on('mouseleave', LAYER_ID, onMouseLeave);
      handlersAttached = true;
    })();

    return () => {
      cancelled = true;
      if (handlersAttached) {
        map.off('click', LAYER_ID, onClick);
        map.off('mouseenter', LAYER_ID, onMouseEnter);
        map.off('mouseleave', LAYER_ID, onMouseLeave);
      }
    };
  }, [map]);

  // RAF loop: compute dead-reckoned positions and push to the GeoJSON source.
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const planes = Object.values(usePlaneStore.getState().planes);
      const features = planes.map((p) => {
        const dt = Math.min(now - p.last_seen_local, MAX_DEAD_RECKON_MS);
        const pos = deadReckon(p, dt);
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [pos.lon, pos.lat]
          },
          properties: {
            icao24: p.icao24,
            callsign: p.callsign ?? '',
            heading: p.heading_deg ?? 0
          }
        };
      });

      const src = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
      src?.setData({ type: 'FeatureCollection', features });

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [map]);

  return null;
}
