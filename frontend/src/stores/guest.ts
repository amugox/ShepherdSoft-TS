import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { Guest, GuestFilter, GuestFollowUp, GuestStats } from '@shepherd/shared';

import { guestApi } from '@/api/guest';
import { usePagination } from '@/composables/usePagination';

export const useGuestStore = defineStore('guest', () => {
  const guests     = ref<Guest[]>([]);
  const total      = ref(0);
  const currentPage = ref(1);
  const stats      = ref<GuestStats | null>(null);
  const followUps  = ref<GuestFollowUp[]>([]);
  const loading    = ref(false);
  const filter     = ref<GuestFilter>({});

  const guestsPg = usePagination();
  const followUpsPg = usePagination();

  /** Pass a filter to apply a new search (resets to page 1); omit it to re-fetch the current page. */
  const find = async (next?: GuestFilter): Promise<void> => {
    if (next) {
      filter.value = next;
      guestsPg.reset();
    }
    loading.value = true;
    try {
<<<<<<< HEAD
      const result = await guestApi.find(filter.value);
      guests.value      = result?.items     ?? [];
      total.value       = result?.total     ?? 0;
      currentPage.value = result?.page      ?? 1;
=======
      const result = await guestApi.find({
        ...filter.value,
        page: guestsPg.page.value,
        pageSize: guestsPg.pageSize.value,
      });
      guests.value = result?.rows ?? [];
      guestsPg.total.value = result?.total ?? 0;
>>>>>>> a7445f1 (feat: add server-side pagination to DataTable list views)
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

  /** guestCode > 0 → one guest's history (not paginated); 0 → paginated pending list. */
  const loadFollowUps = async (guestCode = 0): Promise<void> => {
    loading.value = true;
    try {
      const result = await guestApi.findFollowUps({
        code: guestCode,
        page: followUpsPg.page.value,
        pageSize: followUpsPg.pageSize.value,
      });
      followUps.value = result?.rows ?? [];
      followUpsPg.total.value = result?.total ?? 0;
    } finally {
      loading.value = false;
    }
  };

  const reset = (): void => {
<<<<<<< HEAD
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
=======
    guests.value = [];
    stats.value = null;
    followUps.value = [];
    loading.value = false;
    filter.value = {};
    guestsPg.reset();
    followUpsPg.reset();
  };

  return {
    guests,
    stats,
    followUps,
    loading,
    filter,
    guestsPage: guestsPg.page,
    guestsPageSize: guestsPg.pageSize,
    guestsTotal: guestsPg.total,
    followUpsPage: followUpsPg.page,
    followUpsPageSize: followUpsPg.pageSize,
    followUpsTotal: followUpsPg.total,
    find,
    loadStats,
    loadFollowUps,
    reset,
>>>>>>> a7445f1 (feat: add server-side pagination to DataTable list views)
  };
});
