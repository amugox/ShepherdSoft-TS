import { reactive } from 'vue';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const toasts = reactive<Toast[]>([]);
let nextId = 1;

export const useToast = (): {
  toasts: Toast[];
  show: (message: string, kind?: ToastKind) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
  dismiss: (id: number) => void;
} => {
  const show = (message: string, kind: ToastKind = 'info'): void => {
    const id = nextId++;
    toasts.push({ id, kind, message });
    setTimeout(() => dismiss(id), 4500);
  };
  const dismiss = (id: number): void => {
    const idx = toasts.findIndex((t) => t.id === id);
    if (idx >= 0) toasts.splice(idx, 1);
  };
  return {
    toasts,
    show,
    success: (m: string) => show(m, 'success'),
    error: (m: string) => show(m, 'error'),
    info: (m: string) => show(m, 'info'),
    warning: (m: string) => show(m, 'warning'),
    dismiss,
  };
};
