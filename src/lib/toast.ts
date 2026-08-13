export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'delete';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<ToastListener>();

function notify() {
  listeners.forEach(listener => listener([...toasts]));
}

export const toast = {
  show: (type: ToastType, title: string, description?: string, duration: number = 3500): string => {
    const id = Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    const newToast: ToastItem = {
      id,
      type,
      title,
      description,
      duration,
      createdAt: Date.now()
    };

    // Keep maximum 4 toasts visible at a time
    toasts = [newToast, ...toasts].slice(0, 4);
    notify();

    if (duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, duration);
    }

    return id;
  },

  success: (title: string, description?: string, duration?: number) => {
    return toast.show('success', title, description, duration);
  },

  error: (title: string, description?: string, duration?: number) => {
    return toast.show('error', title, description, duration || 4500);
  },

  info: (title: string, description?: string, duration?: number) => {
    return toast.show('info', title, description, duration);
  },

  warning: (title: string, description?: string, duration?: number) => {
    return toast.show('warning', title, description, duration);
  },

  delete: (title: string, description?: string, duration?: number) => {
    return toast.show('delete', title, description, duration);
  },

  dismiss: (id: string) => {
    toasts = toasts.filter(t => t.id !== id);
    notify();
  },

  clearAll: () => {
    toasts = [];
    notify();
  },

  subscribe: (listener: ToastListener) => {
    listeners.add(listener);
    listener([...toasts]);
    return () => {
      listeners.delete(listener);
    };
  }
};
