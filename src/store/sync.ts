import { create } from 'zustand';

type SyncState = {
  online: boolean;
  pending: number;
  setOnline: (online: boolean) => void;
  setPending: (pending: number) => void;
};

export const useSync = create<SyncState>()((set) => ({
  online: true,
  pending: 0,
  setOnline: (online) => set({ online }),
  setPending: (pending) => set({ pending }),
}));
