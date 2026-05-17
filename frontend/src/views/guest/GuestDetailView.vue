<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { Guest, GuestFollowUp, GuestFollowUpPayload, GuestPromotePayload } from '@shepherd/shared';

import FollowUpAddDialog from '@/components/domain/guest/FollowUpAddDialog.vue';
import PromoteGuestDialog from '@/components/domain/guest/PromoteGuestDialog.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { guestApi } from '@/api/guest';
import { useToast } from '@/composables/useToast';
import { formatDateOnly } from '@/lib/dates';
import { useAuthStore } from '@/stores/auth';
import { ArrowUpCircleIcon, CalendarDaysIcon, TrashIcon } from '@heroicons/vue/24/outline';

const props  = defineProps<{ code: string }>();
const router = useRouter();
const toast  = useToast();
const auth   = useAuthStore();

const guest      = ref<Guest | null>(null);
const followUps  = ref<GuestFollowUp[]>([]);
const loading    = ref(false);
const addOpen    = ref(false);
const promoteOpen = ref(false);
const submitting = ref(false);

const guestCode = computed(() => Number(props.code));

const fullName = computed(() =>
  guest.value ? `${guest.value.fname} ${guest.value.onames ?? ''}`.trim() : '',
);

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    guest.value     = (await guestApi.get(guestCode.value)) ?? null;
    followUps.value = (await guestApi.findFollowUps(guestCode.value)) ?? [];
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load guest.');
  } finally {
    loading.value = false;
  }
};

onMounted(load);
watch(() => props.code, load);

const onAddFollowUp = async (payload: GuestFollowUpPayload): Promise<void> => {
  submitting.value = true;
  try {
    await guestApi.addFollowUp(payload);
    addOpen.value = false;
    toast.success('Follow-up scheduled.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
  } finally {
    submitting.value = false;
  }
};

const onPromote = async (payload: GuestPromotePayload): Promise<void> => {
  submitting.value = true;
  try {
    await guestApi.promote(payload);
    promoteOpen.value = false;
    toast.success('Guest promoted to member.');
    await router.push('/membership');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
  } finally {
    submitting.value = false;
  }
};

const remove = async (): Promise<void> => {
  if (!guest.value?.code) return;
  if (!window.confirm('Delete this guest? This cannot be undone.')) return;
  try {
    await guestApi.remove(guest.value.code);
    toast.success('Guest deleted.');
    await router.push('/guest');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
  }
};

const followUpColumns = [
  { key: 'fdt',           label: 'Date',        width: '120px' },
  { key: 'ftype',         label: 'Type',        align: 'center' as const, width: '100px' },
  { key: 'fstat',         label: 'Status',      align: 'center' as const, width: '100px' },
  { key: 'assigned_name', label: 'Assigned to' },
  { key: 'notes',         label: 'Notes' },
];
</script>

<template>
  <section class="space-y-6">
    <header class="flex items-start justify-between">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          {{ fullName || 'Guest' }}
        </h1>
        <p class="text-sm text-slate-500">
          {{ guest?.pno }} · {{ guest?.email }}
        </p>
      </div>
      <div class="flex gap-2">
        <BaseButton
          variant="secondary"
          :icon="CalendarDaysIcon"
          @click="addOpen = true"
        >
          Schedule follow-up
        </BaseButton>
        <BaseButton
          variant="primary"
          :icon="ArrowUpCircleIcon"
          :disabled="guest?.promoted"
          @click="promoteOpen = true"
        >
          Promote
        </BaseButton>
        <BaseButton
          variant="danger"
          :icon="TrashIcon"
          @click="remove"
        >
          Delete
        </BaseButton>
      </div>
    </header>

    <div
      v-if="guest"
      class="grid gap-6 lg:grid-cols-3"
    >
      <div class="card space-y-2 p-4 lg:col-span-2">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Visit
        </h2>
        <dl class="grid grid-cols-2 gap-2 text-sm">
          <dt class="text-slate-500">
            Visit date
          </dt><dd>{{ formatDateOnly(guest.vdt) }}</dd>
          <dt class="text-slate-500">
            Visit type
          </dt><dd>{{ guest.vtype === 1 ? 'One-time' : 'Joining' }}</dd>
          <dt class="text-slate-500">
            Heard via
          </dt><dd>{{ guest.heard_rmk ?? '—' }}</dd>
          <dt class="text-slate-500">
            Spiritual stage
          </dt><dd>{{ guest.sstage ?? '—' }}</dd>
          <dt class="text-slate-500">
            Group
          </dt><dd>{{ guest.grp_name ?? '—' }}</dd>
          <dt class="text-slate-500">
            Branch
          </dt><dd>{{ guest.br_name ?? '—' }}</dd>
        </dl>
      </div>
      <div class="card space-y-2 p-4">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Feedback
        </h2>
        <p class="text-sm text-slate-700">
          {{ guest.feedback || '—' }}
        </p>
      </div>
    </div>

    <div class="space-y-2">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
        Follow-ups
      </h2>
      <DataTable
        :rows="followUps"
        :columns="followUpColumns"
        :loading="loading"
        empty-text="No follow-ups yet."
      >
        <template #fdt="{ value }">
          {{ formatDateOnly(value as string) }}
        </template>
      </DataTable>
    </div>

    <FollowUpAddDialog
      :open="addOpen"
      :guest-code="guestCode"
      :default-assigned-to="auth.user?.ucode"
      :submitting="submitting"
      @close="addOpen = false"
      @submit="onAddFollowUp"
    />
    <PromoteGuestDialog
      :open="promoteOpen"
      :guest-code="guestCode"
      :default-name="guest?.fname"
      :submitting="submitting"
      @close="promoteOpen = false"
      @submit="onPromote"
    />
  </section>
</template>
