<script setup lang="ts">
import iconMark from '@/assets/images/brand/icon-mark.png';

const props = withDefaults(
  defineProps<{
    /** Pixel size of the pulsing mark. */
    size?: number;
    /** Caption shown beneath the mark (optional). */
    label?: string;
    /** Cover the parent and center within it instead of inline. */
    fullscreen?: boolean;
  }>(),
  { size: 96, label: '', fullscreen: false },
);
</script>

<template>
  <div
    role="status"
    aria-live="polite"
    class="flex flex-col items-center justify-center gap-3"
    :class="fullscreen ? 'fixed inset-0 z-50 bg-bg-neutral/90 backdrop-blur-sm' : ''"
  >
    <img
      :src="iconMark"
      alt="ShepherdSoft - Church Management Software"
      class="brand-pulse select-none"
      :style="{ width: props.size + 'px', height: props.size + 'px' }"
      draggable="false"
      decoding="async"
    >
    <span
      v-if="label"
      class="brand-subtitle text-xs"
    >{{ label }}</span>
    <span class="sr-only">Loading…</span>
  </div>
</template>
