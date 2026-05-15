<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  modelValue?: string | number | null;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
  revealable?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const value = computed({
  get: () => (props.modelValue ?? '') as string | number,
  set: (v: string | number) => emit('update:modelValue', String(v)),
});

const revealed = ref(false);
const showToggle = computed(() => Boolean(props.revealable) && props.type === 'password');
const effectiveType = computed(() =>
  showToggle.value && revealed.value ? 'text' : (props.type ?? 'text'),
);

const id = `inp-${Math.random().toString(36).slice(2, 9)}`;
</script>

<template>
  <div class="flex flex-col">
    <label
      v-if="label"
      :for="id"
      class="label-sm"
    >
      {{ label }}<span
        v-if="required"
        class="text-rose-500"
      >*</span>
    </label>
    <div class="relative">
      <input
        :id="id"
        v-model="value"
        :type="effectiveType"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        class="input-sm w-full"
        :class="{ 'border-rose-500 focus:border-rose-500 focus:ring-rose-200': !!error }"
        :style="showToggle ? { paddingRight: '2.5rem' } : undefined"
      >
      <button
        v-if="showToggle"
        type="button"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        :aria-pressed="revealed"
        :disabled="disabled"
        class="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-slate-400 transition hover:text-slate-600 focus-visible:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:cursor-not-allowed disabled:opacity-50"
        @click="revealed = !revealed"
      >
        <svg
          v-if="revealed"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
          />
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </button>
    </div>
    <p
      v-if="error"
      class="mt-1 text-xs text-rose-600"
    >
      {{ error }}
    </p>
    <p
      v-else-if="hint"
      class="mt-1 text-xs text-slate-500"
    >
      {{ hint }}
    </p>
  </div>
</template>
