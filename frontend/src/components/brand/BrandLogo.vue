<script setup lang="ts">
import { computed } from 'vue';

import iconMark from '@/assets/images/brand/icon-mark.png';

type Variant = 'compact' | 'horizontal' | 'large' | 'hero';
type Tone = 'light' | 'dark';

const props = withDefaults(
  defineProps<{
    variant?: Variant;
    iconOnly?: boolean;
    tone?: Tone;
  }>(),
  { variant: 'horizontal', iconOnly: false, tone: 'light' },
);

const ICON_ONLY_ALT = 'ShepherdSoft - Church Management Software';

const iconSize: Record<Variant, string> = {
  compact: 'h-8 w-8',
  horizontal: 'h-10 w-10',
  large: 'h-16 w-16',
  hero: 'h-24 w-24 sm:h-28 sm:w-28',
};

const wordSize: Record<Variant, string> = {
  compact: 'text-base',
  horizontal: 'text-xl',
  large: 'text-3xl',
  hero: 'text-4xl sm:text-5xl',
};

const textTone = computed(() => (props.tone === 'dark' ? 'text-white' : 'text-slate-blue'));
const subtitleTone = computed(() => (props.tone === 'dark' ? 'text-white/80' : 'text-slate-blue'));
</script>

<template>
  <div
    class="flex items-center gap-3"
    :class="{ 'flex-col text-center gap-4': variant === 'hero' }"
  >
    <img
      :src="iconMark"
      :alt="iconOnly ? ICON_ONLY_ALT : ''"
      :class="[iconSize[props.variant], 'shrink-0 select-none']"
      draggable="false"
      decoding="async"
    >
    <div
      v-if="!iconOnly"
      :class="{ 'flex flex-col items-center': variant === 'hero' }"
    >
      <div
        class="brand-wordmark"
        :class="[wordSize[props.variant], textTone]"
      >
        <span class="brand-wordmark-heavy">Shepherd</span><span class="brand-wordmark-light">Soft</span>
      </div>
      <div
        v-if="variant === 'hero'"
        class="brand-subtitle mt-2 text-sm sm:text-base"
        :class="subtitleTone"
      >
        Church Management Software
      </div>
    </div>
  </div>
</template>
