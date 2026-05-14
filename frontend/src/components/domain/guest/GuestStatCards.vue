<script setup lang="ts">
import type { GuestStats } from '@shepherd/shared';

defineProps<{
  stats: GuestStats | null;
}>();

const cards = (s: GuestStats | null): Array<{ label: string; value: number; tone: string }> => [
  { label: 'Guests this month',   value: s?.guests_mo ?? 0,   tone: 'bg-brand-50 text-brand-700' },
  { label: 'Pending follow-ups',  value: s?.pending_fu ?? 0,  tone: 'bg-amber-50 text-amber-700' },
  { label: 'Overdue follow-ups',  value: s?.overdue_fu ?? 0,  tone: 'bg-rose-50 text-rose-700' },
  { label: 'Promoted this month', value: s?.promoted_mo ?? 0, tone: 'bg-emerald-50 text-emerald-700' },
];
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <div
      v-for="c in cards(stats)"
      :key="c.label"
      class="card p-4"
    >
      <div :class="['inline-flex rounded-md px-2 py-0.5 text-xs font-medium', c.tone]">
        {{ c.label }}
      </div>
      <div class="mt-3 text-3xl font-semibold text-slate-900">
        {{ c.value }}
      </div>
    </div>
  </div>
</template>
