<script setup lang="ts">
import type { Component } from 'vue';

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger';
    type?: 'button' | 'submit' | 'reset';
    loading?: boolean;
    disabled?: boolean;
    icon?: Component;
  }>(),
  { variant: 'primary', type: 'button', loading: false, disabled: false, icon: undefined },
);
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="[
      variant === 'primary' && 'btn-primary',
      variant === 'secondary' && 'btn-secondary',
      variant === 'danger' && 'btn-danger',
    ]"
  >
    <span
      v-if="loading"
      class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
    <component
      :is="icon"
      v-else-if="icon"
      class="h-4 w-4 shrink-0"
    />
    <slot />
  </button>
</template>
