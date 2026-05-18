<script setup lang="ts">
import { onMounted, ref } from 'vue';

import type { Family } from '@shepherd/shared';

import FamilyForm from '@/components/domain/member/FamilyForm.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { memberApi } from '@/api/member';
import { useToast } from '@/composables/useToast';
import { useMemberStore } from '@/stores/member';
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';

const store = useMemberStore();
const toast = useToast();

const search     = ref('');
const addOpen    = ref(false);
const submitting = ref(false);

const load = async (applySearch: boolean): Promise<void> => {
  try { await store.findFamilies(applySearch ? search.value : undefined); }
  catch (err) { toast.error(err instanceof Error ? err.message : 'Failed.'); }
};
const refresh = (): Promise<void> => load(true);
onMounted(refresh);

const onPage = (p: number): void => {
  store.familiesPage = p;
  void load(false);
};
const onPageSize = (size: number): void => {
  store.familiesPageSize = size;
  store.familiesPage = 1;
  void load(false);
};

const onAdd = async (f: Family): Promise<void> => {
  submitting.value = true;
  try {
    await memberApi.famAdd(f);
    addOpen.value = false;
    toast.success('Family added.');
    await refresh();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
  } finally {
    submitting.value = false;
  }
};

const columns = [
  { key: 'code',  label: '#',             width: '80px' },
  { key: 'fname', label: 'Family' },
  { key: 'mname', label: 'Anchor member' },
  { key: 'cname', label: 'Common name' },
];
</script>

<template>
  <section class="space-y-4">
    <BreadcrumbNav :items="[{ label: 'Home', to: '/' }, { label: 'Members', to: '/membership' }, { label: 'Families' }]" />
    <header class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          Families
        </h1>
      </div>
      <BaseButton
        :icon="HomeIcon"
        @click="addOpen = true"
      >
        Add family
      </BaseButton>
    </header>

    <form
      class="flex items-end gap-2"
      @submit.prevent="refresh"
    >
      <BaseInput
        v-model="search"
        label="Search"
        placeholder="Family or member name"
        class="flex-1"
      />
      <BaseButton
        variant="secondary"
        type="submit"
        :icon="MagnifyingGlassIcon"
      >
        Search
      </BaseButton>
    </form>

    <DataTable
      :rows="store.families"
      :columns="columns"
      :loading="store.loading"
      :total="store.familiesTotal"
      :page="store.familiesPage"
      :page-size="store.familiesPageSize"
      empty-text="No families."
      @update:page="onPage"
      @update:page-size="onPageSize"
    />

    <BaseModal
      :open="addOpen"
      title="Add family"
      size="md"
      @close="addOpen = false"
    >
      <FamilyForm
        :submitting="submitting"
        @submit="onAdd"
        @cancel="addOpen = false"
      />
    </BaseModal>
  </section>
</template>
