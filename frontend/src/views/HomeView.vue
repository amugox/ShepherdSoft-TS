<script setup lang="ts">
import { onMounted } from 'vue';

import GuestStatCards from '@/components/domain/guest/GuestStatCards.vue';
import { useToast } from '@/composables/useToast';
import { useGuestStore } from '@/stores/guest';

const guest = useGuestStore();
const toast = useToast();

onMounted(async () => {
  try {
    await guest.loadStats();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load stats.');
  }
});
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        Dashboard
      </h1>
      <p class="text-sm text-slate-500">
        A quick view of guest activity this month.
      </p>
    </header>
    <GuestStatCards :stats="guest.stats" />
  </section>
</template>
