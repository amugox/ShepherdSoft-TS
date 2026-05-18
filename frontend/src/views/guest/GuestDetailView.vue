<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import {
  BornAgainStatus,
  FollowUpStatus,
  FollowUpType,
  type Guest,
  type GuestFollowUp,
  type GuestFollowUpPayload,
  type GuestPromotePayload,
} from '@shepherd/shared';

import FollowUpAddDialog from '@/components/domain/guest/FollowUpAddDialog.vue';
import GuestForm from '@/components/domain/guest/GuestForm.vue';
import PromoteGuestDialog from '@/components/domain/guest/PromoteGuestDialog.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { guestApi } from '@/api/guest';
import { useToast } from '@/composables/useToast';
import { formatDateOnly } from '@/lib/dates';
import { useAuthStore } from '@/stores/auth';
import {
  ArrowUpCircleIcon,
  CalendarDaysIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline';

const props   = defineProps<{ code: string }>();
const router  = useRouter();
const toast   = useToast();
const auth    = useAuthStore();

const guest       = ref<Guest | null>(null);
const followUps   = ref<GuestFollowUp[]>([]);
const loading     = ref(false);
const addOpen     = ref(false);
const promoteOpen = ref(false);
const deleteOpen  = ref(false);
const editMode    = ref(false);
const submitting  = ref(false);

const guestCode = computed(() => Number(props.code));

const fullName = computed(() =>
  guest.value ? `${guest.value.fname} ${guest.value.onames ?? ''}`.trim() : '',
);

const bornAgainLabel = (ba: number | undefined): string => {
  const map: Record<number, string> = {
    [BornAgainStatus.Yes]:     'Yes',
    [BornAgainStatus.No]:      'No',
    [BornAgainStatus.Unknown]: 'Unknown',
  };
  return ba !== undefined ? (map[ba] ?? '—') : '—';
};

const followUpTypeLabel = (ftype: number): string => {
  const map: Record<number, string> = {
    [FollowUpType.Call]:  'Call',
    [FollowUpType.Sms]:   'SMS',
    [FollowUpType.Visit]: 'Visit',
  };
  return map[ftype] ?? String(ftype);
};

const followUpStatusLabel = (fstat: number): string => {
  const map: Record<number, string> = {
    [FollowUpStatus.Pending]:   'Pending',
    [FollowUpStatus.Complete]:  'Complete',
    [FollowUpStatus.Cancelled]: 'Cancelled',
  };
  return map[fstat] ?? String(fstat);
};

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    guest.value     = (await guestApi.get(guestCode.value)) ?? null;
    followUps.value = (await guestApi.findFollowUps({ code: guestCode.value }))?.rows ?? [];
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

const onEdit = async (updated: Guest): Promise<void> => {
  if (!guest.value?.code) return;
  submitting.value = true;
  try {
    await guestApi.update(guest.value.code, updated);
    toast.success('Guest updated.');
    editMode.value = false;
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update guest.');
  } finally {
    submitting.value = false;
  }
};

const confirmDelete = async (): Promise<void> => {
  if (!guest.value?.code) return;
  submitting.value = true;
  try {
    await guestApi.remove(guest.value.code);
    toast.success('Guest deleted.');
    deleteOpen.value = false;
    await router.push('/guest');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed.');
  } finally {
    submitting.value = false;
  }
};

const followUpColumns = [
  { key: 'fdt',           label: 'Date',        width: '110px' },
  { key: 'ftype',         label: 'Type',        align: 'center' as const, width: '80px' },
  { key: 'fstat',         label: 'Status',      align: 'center' as const, width: '90px' },
  { key: 'assigned_name', label: 'Assigned to' },
  { key: 'responded',     label: 'Responded',   align: 'center' as const, width: '90px' },
  { key: 'streak',        label: 'Streak',      align: 'center' as const, width: '70px' },
  { key: 'outcome',       label: 'Outcome' },
  { key: 'notes',         label: 'Notes' },
];
</script>

<template>
  <section class="space-y-6">
    <!-- Edit mode -->
    <div
      v-if="editMode && guest"
      class="card p-6"
    >
      <header class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-semibold text-slate-900">
          Edit guest
        </h2>
        <BaseButton
          variant="secondary"
          :icon="XMarkIcon"
          @click="editMode = false"
        >
          Cancel edit
        </BaseButton>
      </header>
      <GuestForm
        :initial-value="guest"
        :submitting="submitting"
        edit-mode
        @submit="onEdit"
        @cancel="editMode = false"
      />
    </div>

    <!-- Read-only mode -->
    <template v-else>
      <header class="flex items-start justify-between">
        <div>
          <h1 class="text-xl font-semibold text-slate-900">
            {{ fullName || 'Guest' }}
          </h1>
          <p class="text-sm text-slate-500">
            {{ guest?.pno }} · {{ guest?.email }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <BaseButton
            variant="secondary"
            :icon="PencilIcon"
            @click="editMode = true"
          >
            Edit
          </BaseButton>
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
            @click="deleteOpen = true"
          >
            Delete
          </BaseButton>
        </div>
      </header>

      <div
        v-if="guest"
        class="grid gap-6 lg:grid-cols-3"
      >
        <!-- Visit info -->
        <div class="card space-y-2 p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Visit
          </h2>
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <dt class="text-slate-500">
              Visit date
            </dt>
            <dd>{{ formatDateOnly(guest.vdt) }}</dd>
            <dt class="text-slate-500">
              Visit type
            </dt>
            <dd>{{ guest.vtype === 1 ? 'One-time' : 'Joining' }}</dd>
            <dt class="text-slate-500">
              Returning
            </dt>
            <dd>{{ guest.returning ? 'Yes' : 'No' }} ({{ guest.visit_count ?? 1 }} visit{{ (guest.visit_count ?? 1) !== 1 ? 's' : '' }})</dd>
            <dt class="text-slate-500">
              Group
            </dt>
            <dd>{{ guest.grp_name ?? '—' }}</dd>
            <dt class="text-slate-500">
              Branch
            </dt>
            <dd>{{ guest.br_name ?? '—' }}</dd>
            <dt class="text-slate-500">
              Heard via
            </dt>
            <dd>{{ guest.heard_rmk ?? '—' }}</dd>
          </dl>
        </div>

        <!-- Spiritual background -->
        <div class="card space-y-2 p-4">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Spiritual background
          </h2>
          <dl class="grid grid-cols-2 gap-2 text-sm">
            <dt class="text-slate-500">
              Born again
            </dt>
            <dd>{{ bornAgainLabel(guest.ba) }}</dd>
            <dt class="text-slate-500">
              Stage
            </dt>
            <dd>{{ guest.sstage ?? '—' }}</dd>
            <dt class="text-slate-500">
              Location
            </dt>
            <dd>{{ guest.padd ?? '—' }}</dd>
            <dt class="text-slate-500">
              Church of origin
            </dt>
            <dd>{{ guest.porigin ?? '—' }}</dd>
            <dt class="text-slate-500">
              Ministry interest
            </dt>
            <dd>{{ guest.ministry ?? '—' }}</dd>
            <dt class="text-slate-500">
              Pastor / contact
            </dt>
            <dd>{{ guest.oref ?? '—' }}</dd>
          </dl>
          <div
            v-if="guest.promoted && guest.member_code"
            class="mt-3 border-t border-slate-100 pt-3"
          >
            <RouterLink
              :to="`/membership/member/${guest.member_code}`"
              class="text-sm text-brand-700 hover:underline"
            >
              View member profile →
            </RouterLink>
          </div>
        </div>

        <!-- Feedback and internal notes -->
        <div class="card space-y-4 p-4">
          <div>
            <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Feedback
            </h2>
            <p class="text-sm text-slate-700">
              {{ guest.feedback || '—' }}
            </p>
          </div>
          <div class="border-t border-slate-100 pt-3">
            <h2 class="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Internal notes
            </h2>
            <p class="text-sm text-slate-700">
              {{ guest.remarks || '—' }}
            </p>
          </div>
        </div>
      </div>

      <!-- Follow-ups table -->
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
          <template #ftype="{ value }">
            {{ followUpTypeLabel(value as number) }}
          </template>
          <template #fstat="{ value }">
            <span
              class="rounded-full px-2 py-0.5 text-xs font-medium"
              :class="{
                'bg-amber-100 text-amber-700': (value as number) === 0,
                'bg-emerald-100 text-emerald-700': (value as number) === 1,
                'bg-slate-100 text-slate-600': (value as number) === 2,
              }"
            >{{ followUpStatusLabel(value as number) }}</span>
          </template>
          <template #responded="{ value }">
            <span
              v-if="value !== null && value !== undefined"
              :class="value ? 'text-emerald-600' : 'text-rose-500'"
            >
              {{ value ? '✓' : '✗' }}
            </span>
            <span
              v-else
              class="text-slate-400"
            >—</span>
          </template>
          <template #streak="{ value }">
            <span
              v-if="(value as number) > 0"
              class="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700"
            >{{ value }}</span>
            <span
              v-else
              class="text-slate-400"
            >—</span>
          </template>
        </DataTable>
      </div>
    </template>

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

    <!-- Delete confirmation modal -->
    <BaseModal
      :open="deleteOpen"
      title="Delete guest"
      size="sm"
      @close="deleteOpen = false"
    >
      <p class="text-sm text-slate-700">
        Are you sure you want to delete <strong>{{ fullName }}</strong>? This cannot be undone.
      </p>
      <template #footer>
        <BaseButton
          variant="secondary"
          :icon="XMarkIcon"
          @click="deleteOpen = false"
        >
          Cancel
        </BaseButton>
        <BaseButton
          variant="danger"
          :icon="TrashIcon"
          :loading="submitting"
          @click="confirmDelete"
        >
          Delete
        </BaseButton>
      </template>
    </BaseModal>
  </section>
</template>
