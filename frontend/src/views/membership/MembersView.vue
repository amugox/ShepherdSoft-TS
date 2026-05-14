<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { Member } from '@shepherd/shared';

import MemberForm from '@/components/domain/member/MemberForm.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { memberApi } from '@/api/member';
import { useToast } from '@/composables/useToast';
import { useMemberStore } from '@/stores/member';

const memberStore = useMemberStore();
const toast       = useToast();
const router      = useRouter();

const search     = ref('');
const addOpen    = ref(false);
const submitting = ref(false);

const refresh = async (): Promise<void> => {
  try { await memberStore.find(search.value); }
  catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load.'); }
};
onMounted(refresh);

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
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          Members
        </h1>
        <p class="text-sm text-slate-500">
          Registered members across your branch.
        </p>
      </div>
      <BaseButton @click="addOpen = true">
        + Add member
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
      >
        Search
      </BaseButton>
    </form>

    <DataTable
      :rows="memberStore.members"
      :columns="columns"
      :loading="memberStore.loading"
      empty-text="No members found."
      @row-click="open"
    >
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
