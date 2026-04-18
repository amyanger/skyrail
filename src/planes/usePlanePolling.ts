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
    let inflight: AbortController | null = null;

    const poll = async () => {
      const current = bboxRef.current;
      if (!current) return;

      // Abort any previous in-flight poll so stale responses can't clobber fresh ones.
      inflight?.abort();
      const controller = new AbortController();
      inflight = controller;

      try {
        const planes = await fetchPlanes(current, controller.signal);
        if (cancelled || controller.signal.aborted) return;
        usePlaneStore.getState().setPlanes(planes);
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.error('OpenSky poll failed:', err);
      } finally {
        if (inflight === controller) inflight = null;
      }
    };

    poll();
    const handle = window.setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(handle);
      inflight?.abort();
    };
  }, [bbox?.lamin, bbox?.lomin, bbox?.lamax, bbox?.lomax]);
}
