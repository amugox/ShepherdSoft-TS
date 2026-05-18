<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import { ChevronDownIcon } from '@heroicons/vue/24/outline';

export interface DropdownMenuItem {
  label: string;
  icon?: object;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  action: () => void;
}

defineProps<{
  items: DropdownMenuItem[];
  label?: string;
}>();

const open = ref(false);
const container = ref<HTMLElement | null>(null);

const toggle = (): void => {
  open.value = !open.value;
};

const close = (): void => {
  open.value = false;
};

const onClickOutside = (e: MouseEvent): void => {
  if (container.value && !container.value.contains(e.target as Node)) {
    close();
  }
};

onMounted(() => {
  document.addEventListener('mousedown', onClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onClickOutside);
});
</script>

<template>
  <div
    ref="container"
    class="relative inline-block text-left"
  >
    <button
      type="button"
      class="btn-secondary"
      @click.stop="toggle"
    >
      {{ label ?? 'Actions' }}
      <ChevronDownIcon class="h-4 w-4 shrink-0 text-slate-500" />
    </button>

    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="scale-95 opacity-0"
      enter-to-class="scale-100 opacity-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="scale-100 opacity-100"
      leave-to-class="scale-95 opacity-0"
    >
      <div
        v-if="open"
        class="absolute right-0 z-20 mt-1 w-44 origin-top-right rounded-md border border-slate-200 bg-white py-1 shadow-lg"
      >
        <button
          v-for="item in items"
          :key="item.label"
          type="button"
          :disabled="item.disabled"
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
          :class="item.variant === 'danger'
            ? 'text-rose-600 hover:bg-rose-50'
            : 'text-slate-700 hover:bg-slate-50'"
          @click.stop="() => { item.action(); close(); }"
        >
          <component
            :is="item.icon"
            v-if="item.icon"
            class="h-4 w-4 shrink-0"
          />
          {{ item.label }}
        </button>
      </div>
    </Transition>
  </div>
</template>
