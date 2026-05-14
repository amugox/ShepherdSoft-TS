<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts, dismiss } = useToast();

const klass = (kind: string): string => {
  switch (kind) {
    case 'success': return 'bg-emerald-600 text-white';
    case 'error':   return 'bg-rose-600 text-white';
    case 'warning': return 'bg-amber-500 text-white';
    default:        return 'bg-slate-800 text-white';
  }
};
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-[100] flex w-80 flex-col gap-2">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        :class="['pointer-events-auto flex items-start justify-between gap-3 rounded-md px-4 py-3 text-sm shadow-lg', klass(t.kind)]"
      >
        <span class="flex-1">{{ t.message }}</span>
        <button
          class="ml-2 text-white/80 hover:text-white"
          @click="dismiss(t.id)"
        >
          ×
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from { opacity: 0; transform: translateY(-10px); }
.toast-leave-to { opacity: 0; transform: translateX(20px); }
</style>
