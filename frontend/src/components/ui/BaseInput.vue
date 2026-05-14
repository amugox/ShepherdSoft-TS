<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue?: string | number | null;
  label?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  hint?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const value = computed({
  get: () => (props.modelValue ?? '') as string | number,
  set: (v: string | number) => emit('update:modelValue', String(v)),
});

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
    <input
      :id="id"
      v-model="value"
      :type="type ?? 'text'"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      class="input-sm"
      :class="{ 'border-rose-500 focus:border-rose-500 focus:ring-rose-200': !!error }"
    >
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
