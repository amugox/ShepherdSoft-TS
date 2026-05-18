<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import type { GuestFollowUp, GuestFollowUpCompletePayload, GuestFollowUpReschedulePayload } from '@shepherd/shared';

import FollowUpCompleteDialog from '@/components/domain/guest/FollowUpCompleteDialog.vue';
import FollowUpRescheduleDialog from '@/components/domain/guest/FollowUpRescheduleDialog.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { guestApi } from '@/api/guest';
import { useToast } from '@/composables/useToast';
import { formatDateOnly } from '@/lib/dates';
import { useGuestStore } from '@/stores/guest';
import { CheckCircleIcon, ClockIcon, XCircleIcon } from '@heroicons/vue/24/outline';

const guestStore   = useGuestStore();
const toast        = useToast();
const router       = useRouter();

const completing   = ref<GuestFollowUp | null>(null);
const rescheduling = ref<GuestFollowUp | null>(null);
const submitting   = ref(false);

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

const onReschedule = async (payload: GuestFollowUpReschedulePayload): Promise<void> => {
  submitting.value = true;
  try {
    await guestApi.rescheduleFollowUp(payload);
    toast.success('Follow-up rescheduled.');
    rescheduling.value = null;
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
  { key: 'fdt',           label: 'Date',        width: '110px' },
  { key: 'fname',         label: 'Guest' },
  { key: 'ftype',         label: 'Type',        align: 'center' as const, width: '80px' },
  { key: 'assigned_name', label: 'Assigned to' },
  { key: 'streak',        label: 'No-reply',    align: 'center' as const, width: '80px' },
  { key: 'notes',         label: 'Notes' },
  { key: 'actions',       label: '',            align: 'right' as const, width: '220px', get: () => '' },
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
      <template #fdt="{ value }">
        {{ formatDateOnly(value as string) }}
      </template>
      <template #fname="{ row }">
        <button
          class="font-medium text-brand-700 hover:underline"
          @click="router.push(`/guest/${row.g_code}`)"
        >
          {{ row.fname }} {{ row.onames ?? '' }}
        </button>
      </template>
      <template #ftype="{ value }">
        {{ ({ 1: 'Call', 2: 'SMS', 3: 'Visit' } as Record<number,string>)[(value as number)] ?? value }}
      </template>
      <template #streak="{ value }">
        <span
          v-if="(value as number) > 0"
          class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700"
          :title="`${value} unanswered contact(s) in a row`"
        >{{ value }}</span>
        <span
          v-else
          class="text-slate-400"
        >—</span>
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
            variant="secondary"
            :icon="ClockIcon"
            @click.stop="rescheduling = row"
          >
            Reschedule
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
    <FollowUpRescheduleDialog
      :open="rescheduling !== null"
      :follow-up-code="rescheduling?.code ?? 0"
      :current-date="rescheduling?.fdt"
      :current-assigned-to="rescheduling?.assigned_to"
      :submitting="submitting"
      @close="rescheduling = null"
      @submit="onReschedule"
    />
  </section>
</template>
