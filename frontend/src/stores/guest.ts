import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { Guest, GuestFilter, GuestFollowUp, GuestStats } from '@shepherd/shared';

import { guestApi } from '@/api/guest';

export const useGuestStore = defineStore('guest', () => {
  const guests     = ref<Guest[]>([]);
  const total      = ref(0);
  const currentPage = ref(1);
  const stats      = ref<GuestStats | null>(null);
  const followUps  = ref<GuestFollowUp[]>([]);
  const loading    = ref(false);
  const filter     = ref<GuestFilter>({});

  const find = async (next?: GuestFilter): Promise<void> => {
    if (next) filter.value = next;
    loading.value = true;
    try {
      const result = await guestApi.find(filter.value);
      guests.value      = result?.items     ?? [];
      total.value       = result?.total     ?? 0;
      currentPage.value = result?.page      ?? 1;
    } finally {
      loading.value = false;
    }
  };

  const loadPage = async (page: number): Promise<void> => {
    filter.value = { ...filter.value, page };
    await find();
  };

  const loadStats = async (): Promise<void> => {
    stats.value = (await guestApi.stats()) ?? null;
  };

  const loadFollowUps = async (guestCode = 0): Promise<void> => {
    followUps.value = (await guestApi.findFollowUps(guestCode)) ?? [];
  };

  const reset = (): void => {
    guests.value      = [];
    total.value       = 0;
    currentPage.value = 1;
    stats.value       = null;
    followUps.value   = [];
    loading.value     = false;
    filter.value      = {};
  };

  return {
    guests, total, currentPage, stats, followUps, loading, filter,
    find, loadPage, loadStats, loadFollowUps, reset,
  };
});
