<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowDownTrayIcon, UserPlusIcon } from '@heroicons/vue/24/outline';

import type { Guest, GuestFilter } from '@shepherd/shared';

import GuestFilters from '@/components/domain/guest/GuestFilters.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { useToast } from '@/composables/useToast';
import { formatDateOnly } from '@/lib/dates';
import { useGuestStore } from '@/stores/guest';

const guest  = useGuestStore();
const router = useRouter();
const toast  = useToast();
const filter = ref<GuestFilter>({});

const pageSize = 100;
const totalPages = computed(() => Math.max(1, Math.ceil(guest.total / pageSize)));

const columns = [
  { key: 'vdt',      label: 'Visit', width: '110px' },
  { key: 'fname',    label: 'Name' },
  { key: 'pno',      label: 'Phone' },
  { key: 'grp_name', label: 'Group' },
  { key: 'vtype',    label: 'Type',  align: 'center' as const, width: '90px' },
  { key: 'sstage',   label: 'Stage', align: 'center' as const, width: '90px' },
];

<<<<<<< HEAD
const refresh = async (): Promise<void> => {
  try { await guest.find({ ...filter.value, page: 1, page_size: pageSize }); }
=======
const load = async (applyFilter: boolean): Promise<void> => {
  try { await guest.find(applyFilter ? filter.value : undefined); }
>>>>>>> a7445f1 (feat: add server-side pagination to DataTable list views)
  catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load.'); }
};
const refresh = (): Promise<void> => load(true);
onMounted(refresh);

<<<<<<< HEAD
const goToPage = async (page: number): Promise<void> => {
  try { await guest.find({ ...filter.value, page, page_size: pageSize }); }
  catch (err) { toast.error(err instanceof Error ? err.message : 'Failed.'); }
=======
const onPage = (p: number): void => {
  guest.guestsPage = p;
  void load(false);
};
const onPageSize = (size: number): void => {
  guest.guestsPageSize = size;
  guest.guestsPage = 1;
  void load(false);
>>>>>>> a7445f1 (feat: add server-side pagination to DataTable list views)
};

const openGuest = (row: Guest): void => {
  if (row.code) void router.push(`/guest/${row.code}`);
};

const exportCsv = (): void => {
  const rows = guest.guests;
  if (!rows.length) return;
  const headers = ['Code', 'First Name', 'Other Names', 'Phone', 'Email', 'Visit Date', 'Visit Type', 'Spiritual Stage', 'Born Again', 'Location', 'Group', 'Branch', 'Heard Via'];
  const lines = [
    headers.join(','),
    ...rows.map((r) =>
      [
        r.code ?? '',
        r.fname,
        r.onames ?? '',
        r.pno ?? '',
        r.email ?? '',
        r.vdt ?? '',
        r.vtype ?? '',
        r.sstage ?? '',
        r.ba ?? '',
        r.padd ?? '',
        r.grp_name ?? '',
        r.br_name ?? '',
        r.heard ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','),
    ),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `guests-page-${guest.currentPage}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          Guests
        </h1>
        <p class="text-sm text-slate-500">
          All visitors and their visit history.
          <span
            v-if="guest.total > 0"
            class="ml-1 font-medium text-slate-700"
          >{{ guest.total }} total</span>
        </p>
      </div>
      <div class="flex gap-2">
        <button
          class="btn-secondary"
          :disabled="guest.guests.length === 0"
          @click="exportCsv"
        >
          <ArrowDownTrayIcon class="h-4 w-4 shrink-0" />
          Export CSV
        </button>
        <RouterLink
          to="/guest/register"
          class="btn-primary"
        >
          <UserPlusIcon class="h-4 w-4 shrink-0" />
          Register guest
        </RouterLink>
      </div>
    </header>

    <GuestFilters
      v-model="filter"
      @submit="refresh"
    />

    <DataTable
      :rows="guest.guests"
      :columns="columns"
      :loading="guest.loading"
      :total="guest.guestsTotal"
      :page="guest.guestsPage"
      :page-size="guest.guestsPageSize"
      empty-text="No guests match the current filter."
      @row-click="openGuest"
      @update:page="onPage"
      @update:page-size="onPageSize"
    >
      <template #vdt="{ value }">
        {{ formatDateOnly(value as string) }}
      </template>
      <template #fname="{ row }">
        <span class="font-medium text-slate-900">
          {{ row.fname }} {{ row.onames ?? '' }}
        </span>
      </template>
      <template #vtype="{ value }">
        <span
          v-if="value === 1"
          class="rounded-full bg-slate-100 px-2 py-0.5 text-xs"
        >One-time</span>
        <span
          v-else-if="value === 2"
          class="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
        >Joining</span>
      </template>
    </DataTable>

    <!-- Pagination -->
    <div
      v-if="totalPages > 1"
      class="flex items-center justify-between text-sm"
    >
      <span class="text-slate-500">
        Page {{ guest.currentPage }} of {{ totalPages }}
      </span>
      <div class="flex gap-1">
        <button
          class="btn-secondary"
          :disabled="guest.currentPage <= 1"
          @click="goToPage(guest.currentPage - 1)"
        >
          ← Prev
        </button>
        <button
          class="btn-secondary"
          :disabled="guest.currentPage >= totalPages"
          @click="goToPage(guest.currentPage + 1)"
        >
          Next →
        </button>
      </div>
    </div>
  </section>
</template>
