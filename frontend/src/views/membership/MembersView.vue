<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { Member } from '@shepherd/shared';

import MemberForm from '@/components/domain/member/MemberForm.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { memberApi } from '@/api/member';
import { useToast } from '@/composables/useToast';
import { formatDateOnly } from '@/lib/dates';
import { useMemberStore } from '@/stores/member';
import { UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline';

const memberStore = useMemberStore();
const toast       = useToast();
const router      = useRouter();

const search     = ref('');
const addOpen    = ref(false);
const submitting = ref(false);

const load = async (applySearch: boolean): Promise<void> => {
  try { await memberStore.find(applySearch ? search.value : undefined); }
  catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load.'); }
};
const refresh = (): Promise<void> => load(true);
onMounted(refresh);

const onPage = (p: number): void => {
  memberStore.membersPage = p;
  void load(false);
};
const onPageSize = (size: number): void => {
  memberStore.membersPageSize = size;
  memberStore.membersPage = 1;
  void load(false);
};

const onAdd = async (m: Member): Promise<void> => {
  submitting.value = true;
  try {
    await memberApi.add(m);
    addOpen.value = false;
    toast.success('Member added.');
    await refresh();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
  } finally {
    submitting.value = false;
  }
};

const columns = [
  { key: 'mno',     label: 'No.',    width: '90px' },
  { key: 'fname',   label: 'Name' },
  { key: 'pno',     label: 'Phone',  width: '140px' },
  { key: 'grpn',    label: 'Group',  width: '140px' },
  { key: 'jdt',     label: 'Joined', width: '120px' },
];

const open = (m: Member): void => {
  if (m.code) void router.push(`/membership/member/${m.code}`);
};
</script>

<template>
  <section class="space-y-4">
    <BreadcrumbNav :items="[{ label: 'Home', to: '/' }, { label: 'Members' }]" />
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          Members
        </h1>
        <p class="text-sm text-slate-500">
          Registered members across your branch.
        </p>
      </div>
      <BaseButton
        :icon="UserPlusIcon"
        @click="addOpen = true"
      >
        Add member
      </BaseButton>
    </header>

    <form
      class="flex items-end gap-2"
      @submit.prevent="refresh"
    >
      <BaseInput
        v-model="search"
        label="Search"
        placeholder="Name, phone or email"
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
      :rows="memberStore.members"
      :columns="columns"
      :loading="memberStore.loading"
      :total="memberStore.membersTotal"
      :page="memberStore.membersPage"
      :page-size="memberStore.membersPageSize"
      empty-text="No members found."
      @row-click="open"
      @update:page="onPage"
      @update:page-size="onPageSize"
    >
      <template #jdt="{ value }">
        {{ formatDateOnly(value as string) }}
      </template>
      <template #fname="{ row }">
        <span class="font-medium text-slate-900">{{ row.fname }} {{ row.onames ?? '' }}</span>
      </template>
    </DataTable>

    <BaseModal
      :open="addOpen"
      title="Add member"
      size="lg"
      @close="addOpen = false"
    >
      <MemberForm
        :submitting="submitting"
        @submit="onAdd"
        @cancel="addOpen = false"
      />
    </BaseModal>
  </section>
</template>
