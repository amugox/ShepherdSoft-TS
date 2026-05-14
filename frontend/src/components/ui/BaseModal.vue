<script setup lang="ts">
defineProps<{
  open: boolean;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
        @click.self="emit('close')"
      >
        <div
          class="card max-h-[90vh] w-full overflow-hidden"
          :class="{
            'max-w-md': size === 'sm',
            'max-w-2xl': !size || size === 'md',
            'max-w-3xl': size === 'lg',
            'max-w-5xl': size === 'xl',
          }"
        >
          <header class="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <h2 class="text-base font-semibold text-slate-900">
              {{ title }}
            </h2>
            <button
              class="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              @click="emit('close')"
            >
              <span class="block h-5 w-5 text-center text-xl leading-5">&times;</span>
            </button>
          </header>
          <div class="max-h-[75vh] overflow-y-auto p-5">
            <slot />
          </div>
          <footer
            v-if="$slots.footer"
            class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
