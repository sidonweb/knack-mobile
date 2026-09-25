import { create } from 'zustand';

export type Toast = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastState = {
  toast: Toast | null;
  show: (toast: Omit<Toast, 'id'>) => void;
  hide: (id?: number) => void;
};

let nextId = 1;

/** One transient message at a time (e.g. "Task deleted · Undo"). A new one replaces the old. */
export const useToast = create<ToastState>()((set) => ({
  toast: null,
  show: (toast) => set({ toast: { ...toast, id: nextId++ } }),
  hide: (id) => set((state) => (id === undefined || state.toast?.id === id ? { toast: null } : state)),
}));
