<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue?: string | null;
  label?: string;
  placeholder?: string;
  required?: boolean;
  rows?: number;
  maxlength?: number;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void;
}>();

const value = computed({
  get: () => props.modelValue ?? '',
  set: (v: string) => emit('update:modelValue', v),
});

const id = `ta-${Math.random().toString(36).slice(2, 9)}`;
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
    <textarea
      :id="id"
      v-model="value"
      :placeholder="placeholder"
      :rows="rows ?? 3"
      :maxlength="maxlength"
      :required="required"
      class="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
      :class="{ 'border-rose-500 focus:border-rose-500 focus:ring-rose-200': !!error }"
    />
    <p
      v-if="error"
      class="mt-1 text-xs text-rose-600"
    >
      {{ error }}
    </p>
  </div>
</template>
