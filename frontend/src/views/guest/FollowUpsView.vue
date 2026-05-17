<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { GuestFollowUp, GuestFollowUpCompletePayload } from '@shepherd/shared';

import FollowUpCompleteDialog from '@/components/domain/guest/FollowUpCompleteDialog.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { guestApi } from '@/api/guest';
import { useToast } from '@/composables/useToast';
import { useGuestStore } from '@/stores/guest';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/vue/24/outline';

const guestStore = useGuestStore();
const toast      = useToast();
const router     = useRouter();

const completing = ref<GuestFollowUp | null>(null);
const submitting = ref(false);

const load = async (): Promise<void> => {
  try { await guestStore.loadFollowUps(); }
  catch (err) { toast.error(err instanceof Error ? err.message : 'Failed.'); }
};
onMounted(load);

const onComplete = async (payload: GuestFollowUpCompletePayload): Promise<void> => {
  submitting.value = true;
  try {
    await guestApi.completeFollowUp(payload);
    toast.success('Follow-up completed.');
    completing.value = null;
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
  } finally {
    submitting.value = false;
  }
};

const cancel = async (row: GuestFollowUp): Promise<void> => {
  if (!window.confirm('Cancel this follow-up?')) return;
  try {
    await guestApi.cancelFollowUp(row.code);
    toast.success('Follow-up cancelled.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
  }
};

const columns = [
  { key: 'fdt',           label: 'Date',        width: '120px' },
  { key: 'fname',         label: 'Guest' },
  { key: 'ftype',         label: 'Type',        align: 'center' as const, width: '100px' },
  { key: 'assigned_name', label: 'Assigned to' },
  { key: 'notes',         label: 'Notes' },
  { key: 'actions',       label: '',            align: 'right' as const, width: '180px', get: () => '' },
];
</script>

<template>
  <section class="space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        Pending follow-ups
      </h1>
      <p class="text-sm text-slate-500">
        Scheduled contacts awaiting action.
      </p>
    </header>
    <DataTable
      :rows="guestStore.followUps"
      :columns="columns"
      empty-text="No pending follow-ups."
    >
      <template #fname="{ row }">
        <button
          class="font-medium text-brand-700 hover:underline"
          @click="router.push(`/guest/${row.g_code}`)"
        >
          {{ row.fname }} {{ row.onames ?? '' }}
        </button>
      </template>
      <template #actions="{ row }">
        <div class="flex justify-end gap-1">
          <BaseButton
            variant="secondary"
            :icon="CheckCircleIcon"
            @click.stop="completing = row"
          >
            Complete
          </BaseButton>
          <BaseButton
            variant="danger"
            :icon="XCircleIcon"
            @click.stop="cancel(row)"
          >
            Cancel
          </BaseButton>
        </div>
      </template>
    </DataTable>

    <FollowUpCompleteDialog
      :open="completing !== null"
      :follow-up-code="completing?.code ?? 0"
      :submitting="submitting"
      @close="completing = null"
      @submit="onComplete"
    />
  </section>
</template>
