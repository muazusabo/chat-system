import { create } from 'zustand';

export interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    
    // Auto-remove after duration (default 5s)
    if (toast.duration !== Infinity) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, toast.duration ?? 5000);
    }
    
    return id;
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));

export function useToast() {
  const { addToast } = useToastStore();
  
  return {
    success: (title: string, message?: string, duration?: number) =>
      addToast({ title, message: message ?? '', type: 'success', duration }),
    error: (title: string, message?: string, duration?: number) =>
      addToast({ title, message: message ?? '', type: 'error', duration }),
    info: (title: string, message?: string, duration?: number) =>
      addToast({ title, message: message ?? '', type: 'info', duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addToast({ title, message: message ?? '', type: 'warning', duration }),
  };
}
