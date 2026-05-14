import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { Guest, GuestFilter, GuestFollowUp, GuestStats } from '@shepherd/shared';

import { guestApi } from '@/api/guest';

export const useGuestStore = defineStore('guest', () => {
  const guests = ref<Guest[]>([]);
  const stats = ref<GuestStats | null>(null);
  const followUps = ref<GuestFollowUp[]>([]);
  const loading = ref(false);
  const filter = ref<GuestFilter>({});

  const find = async (next?: GuestFilter): Promise<void> => {
    if (next) filter.value = next;
    loading.value = true;
    try {
      guests.value = (await guestApi.find(filter.value)) ?? [];
    } finally {
      loading.value = false;
    }
  };

  const loadStats = async (): Promise<void> => {
    stats.value = (await guestApi.stats()) ?? null;
  };

  const loadFollowUps = async (guestCode = 0): Promise<void> => {
    followUps.value = (await guestApi.findFollowUps(guestCode)) ?? [];
  };

  const reset = (): void => {
    guests.value = [];
    stats.value = null;
    followUps.value = [];
    loading.value = false;
    filter.value = {};
  };

  return { guests, stats, followUps, loading, filter, find, loadStats, loadFollowUps, reset };
});
