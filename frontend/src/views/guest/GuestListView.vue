<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { UserPlusIcon } from '@heroicons/vue/24/outline';

import type { Guest, GuestFilter } from '@shepherd/shared';

import GuestFilters from '@/components/domain/guest/GuestFilters.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { useToast } from '@/composables/useToast';
import { useGuestStore } from '@/stores/guest';

const guest  = useGuestStore();
const router = useRouter();
const toast  = useToast();
const filter = ref<GuestFilter>({});

const columns = [
  { key: 'vdt',      label: 'Visit', width: '120px' },
  { key: 'fname',    label: 'Name' },
  { key: 'pno',      label: 'Phone' },
  { key: 'grp_name', label: 'Group' },
  { key: 'vtype',    label: 'Type',  align: 'center' as const, width: '90px' },
  { key: 'sstage',   label: 'Stage', align: 'center' as const, width: '90px' },
];

const refresh = async (): Promise<void> => {
  try { await guest.find(filter.value); }
  catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load.'); }
};
onMounted(refresh);

const openGuest = (row: Guest): void => {
  if (row.code) void router.push(`/guest/${row.code}`);
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
        </p>
      </div>
      <RouterLink
        to="/guest/register"
        class="btn-primary"
      >
        <UserPlusIcon class="h-4 w-4 shrink-0" />
        Register guest
      </RouterLink>
    </header>

    <GuestFilters
      v-model="filter"
      @submit="refresh"
    />

    <DataTable
      :rows="guest.guests"
      :columns="columns"
      :loading="guest.loading"
      empty-text="No guests match the current filter."
      @row-click="openGuest"
    >
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
  </section>
</template>
