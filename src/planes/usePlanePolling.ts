import { useEffect, useRef } from 'react';
import { POLL_INTERVAL_MS } from '../config';
import type { OpenSkyBbox } from '../util/bbox';
import { fetchPlanes } from './opensky';
import { usePlaneStore } from './store';

export function usePlanePolling(bbox: OpenSkyBbox | null) {
  const bboxRef = useRef(bbox);
  bboxRef.current = bbox;

  useEffect(() => {
    if (!bbox) return;
    let cancelled = false;

    const poll = async () => {
      const current = bboxRef.current;
      if (!current) return;
      try {
        const planes = await fetchPlanes(current);
        if (!cancelled) usePlaneStore.getState().setPlanes(planes);
      } catch (err) {
        console.error('OpenSky poll failed:', err);
      }
    };

    poll();
    const handle = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
    };
  }, [bbox?.lamin, bbox?.lomin, bbox?.lamax, bbox?.lomax]);
}
