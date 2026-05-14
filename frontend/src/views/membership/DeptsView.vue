<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { ListItemType, type ListItem } from '@shepherd/shared';

import DataTable from '@/components/ui/DataTable.vue';
import { dataApi } from '@/api/data';
import { useToast } from '@/composables/useToast';

const items = ref<ListItem[]>([]);
const loading = ref(false);
const toast = useToast();

onMounted(async () => {
  loading.value = true;
  try {
    items.value = (await dataApi.getList(ListItemType.MemberGroup)) ?? [];
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load departments.');
  } finally {
    loading.value = false;
  }
});

const columns = [
  { key: 'itemvalue', label: 'Code', width: '120px' },
  { key: 'itemname', label: 'Name' },
];
</script>

<template>
  <section class="space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        Departments
      </h1>
      <p class="text-sm text-slate-500">
        Reference data — managed by admins.
      </p>
    </header>
    <DataTable
      :rows="items"
      :columns="columns"
      :loading="loading"
      empty-text="No departments."
    />
  </section>
</template>
