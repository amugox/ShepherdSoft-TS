import { ref } from 'vue';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolver?: (value: boolean) => void;
}

const state = ref<ConfirmState>({
  open: false,
  title: 'Confirm',
  message: 'Are you sure?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
});

export const useConfirm = (): {
  state: typeof state;
  ask: (opts: Partial<Omit<ConfirmState, 'open' | 'resolver'>>) => Promise<boolean>;
  resolve: (value: boolean) => void;
} => {
  const ask = (opts: Partial<Omit<ConfirmState, 'open' | 'resolver'>>): Promise<boolean> => {
    state.value = { ...state.value, open: true, ...opts };
    return new Promise<boolean>((resolve) => {
      state.value.resolver = resolve;
    });
  };
  const resolve = (value: boolean): void => {
    state.value.resolver?.(value);
    state.value.open = false;
    state.value.resolver = undefined;
  };
  return { state, ask, resolve };
};
