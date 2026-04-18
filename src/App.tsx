import { useState } from 'react';
import { Map } from './map/Map';
import { PlaneLayer } from './planes/PlaneLayer';
import { PlaneDetailCard } from './planes/PlaneDetailCard';
import { usePlanePolling } from './planes/usePlanePolling';
import type { OpenSkyBbox } from './util/bbox';

export default function App() {
  const [bbox, setBbox] = useState<OpenSkyBbox | null>(null);
  usePlanePolling(bbox);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      <Map onBboxChange={setBbox}>
        {(map) => <PlaneLayer map={map} />}
      </Map>
      <PlaneDetailCard />
    </div>
  );
}
