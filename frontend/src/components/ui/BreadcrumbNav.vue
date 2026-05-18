<script setup lang="ts">
import { RouterLink } from 'vue-router';

import { ChevronRightIcon } from '@heroicons/vue/24/outline';

interface BreadcrumbItem {
  label: string;
  to?: string;
}

defineProps<{ items: BreadcrumbItem[] }>();
</script>

<template>
  <nav
    class="flex items-center gap-1 text-sm text-slate-500"
    aria-label="Breadcrumb"
  >
    <template
      v-for="(item, index) in items"
      :key="index"
    >
      <ChevronRightIcon
        v-if="index > 0"
        class="h-3.5 w-3.5 shrink-0 text-slate-400"
      />
      <RouterLink
        v-if="item.to"
        :to="item.to"
        class="transition-colors hover:text-brand-700"
      >
        {{ item.label }}
      </RouterLink>
      <span
        v-else
        class="font-medium text-slate-700"
      >
        {{ item.label }}
      </span>
    </template>
  </nav>
</template>
