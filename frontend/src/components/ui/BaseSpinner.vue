<script setup lang="ts">
defineProps<{ size?: 'sm' | 'md' | 'lg' }>();
</script>

<template>
  <span
    class="inline-block animate-spin rounded-full border-2 border-current border-r-transparent"
    :class="{
      'h-4 w-4': !size || size === 'sm',
      'h-6 w-6': size === 'md',
      'h-10 w-10': size === 'lg',
    }"
  />
</template>
