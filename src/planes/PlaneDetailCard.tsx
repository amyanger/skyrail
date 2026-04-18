import { usePlaneStore } from './store';

export function PlaneDetailCard() {
  const selected = usePlaneStore((s) =>
    s.selectedIcao24 ? s.planes[s.selectedIcao24] : null
  );
  const close = usePlaneStore((s) => s.selectPlane);

  if (!selected) return null;

  const altFt =
    selected.altitude_m != null
      ? Math.round(selected.altitude_m * 3.28084).toLocaleString()
      : '—';
  const speedKt =
    selected.velocity_mps != null ? Math.round(selected.velocity_mps * 1.94384) : '—';

  return (
    <div className="absolute top-4 right-4 w-72 bg-black/80 text-white backdrop-blur border border-white/20 rounded-lg p-4 shadow-xl">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-white/50">Callsign</div>
          <div className="text-lg font-semibold">
            {selected.callsign || selected.icao24}
          </div>
        </div>
        <button
          onClick={() => close(null)}
          className="text-white/50 hover:text-white text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-white/50 text-xs">Origin country</div>
          <div>{selected.origin_country || '—'}</div>
        </div>
        <div>
          <div className="text-white/50 text-xs">ICAO24</div>
          <div className="font-mono">{selected.icao24}</div>
        </div>
        <div>
          <div className="text-white/50 text-xs">Altitude</div>
          <div>{altFt} ft</div>
        </div>
        <div>
          <div className="text-white/50 text-xs">Speed</div>
          <div>{speedKt} kt</div>
        </div>
      </div>
    </div>
  );
}
