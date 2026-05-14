<script setup lang="ts" generic="V extends string | number">
import { computed } from 'vue';

export interface Option<V extends string | number> {
  value: V;
  label: string;
}

const props = defineProps<{
  modelValue?: V | null;
  options: Option<V>[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: V | null): void;
}>();

const value = computed({
  get: () => props.modelValue ?? ('' as unknown as V),
  set: (v: V | string) => emit('update:modelValue', v === '' ? null : (v as V)),
});

const id = `sel-${Math.random().toString(36).slice(2, 9)}`;
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
    <select
      :id="id"
      v-model="value"
      :required="required"
      :disabled="disabled"
      class="input-sm"
      :class="{ 'border-rose-500 focus:border-rose-500 focus:ring-rose-200': !!error }"
    >
      <option value="">
        {{ placeholder ?? '— Select —' }}
      </option>
      <option
        v-for="opt in options"
        :key="String(opt.value)"
        :value="opt.value"
      >
        {{ opt.label }}
      </option>
    </select>
    <p
      v-if="error"
      class="mt-1 text-xs text-rose-600"
    >
      {{ error }}
    </p>
  </div>
</template>
