import { create } from 'zustand';
import type { PlaneState } from './types';

type PlaneStore = {
  planes: Record<string, PlaneState>;
  selectedIcao24: string | null;
  setPlanes: (list: PlaneState[]) => void;
  selectPlane: (icao24: string | null) => void;
  reset: () => void;
};

export const usePlaneStore = create<PlaneStore>((set) => ({
  planes: {},
  selectedIcao24: null,
  setPlanes: (list) => {
    const next: Record<string, PlaneState> = {};
    for (const p of list) next[p.icao24] = p;
    set({ planes: next });
  },
  selectPlane: (icao24) => set({ selectedIcao24: icao24 }),
  reset: () => set({ planes: {}, selectedIcao24: null })
}));
