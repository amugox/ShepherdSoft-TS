<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';

import { FollowUpType, type GuestFollowUpPayload } from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import { todayLocal } from '@/lib/dates';
import { userApi } from '@/api/user';
import { XMarkIcon, CalendarDaysIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  open: boolean;
  guestCode: number;
  defaultAssignedTo?: number;
  submitting?: boolean;
}>();
const emit = defineEmits<{
  (e: 'submit', payload: GuestFollowUpPayload): void;
  (e: 'close'): void;
}>();

const userOptions = ref<Array<{ value: number; label: string }>>([]);

onMounted(async () => {
  try {
    const users = await userApi.list({});
    userOptions.value = (users ?? [])
      .filter((u) => u.user_stat === 0)
      .map((u) => ({ value: u.user_code, label: u.full_name ?? u.user_name }));
  } catch {
    // Gracefully degrade — the select will be empty; user can still proceed.
  }
});

const initial = (): GuestFollowUpPayload => ({
  g_code: props.guestCode,
  ftype: FollowUpType.Call,
  fdt: todayLocal(),
  notes: '',
  assigned_to: props.defaultAssignedTo ?? 0,
});

const form = reactive<GuestFollowUpPayload>(initial());
watch(() => props.guestCode, (v) => { form.g_code = v; });
watch(() => props.defaultAssignedTo, (v) => { form.assigned_to = v ?? 0; });

const typeOptions = [
  { value: FollowUpType.Call,  label: 'Phone call' },
  { value: FollowUpType.Sms,   label: 'SMS' },
  { value: FollowUpType.Visit, label: 'Visit' },
];
</script>

<template>
  <BaseModal
    :open="open"
    title="Schedule follow-up"
    size="md"
    @close="emit('close')"
  >
    <form
      class="space-y-3"
      @submit.prevent="emit('submit', { ...form })"
    >
      <BaseSelect
        v-model="form.ftype"
        label="Type"
        required
        :options="typeOptions"
      />
      <BaseInput
        v-model="form.fdt"
        type="date"
        label="Date"
        required
      />
      <BaseSelect
        v-if="userOptions.length > 0"
        v-model="form.assigned_to"
        label="Assign to"
        required
        :options="userOptions"
      />
      <BaseInput
        v-else
        v-model.number="form.assigned_to"
        type="number"
        label="Assigned to (user code)"
        required
      />
      <BaseTextarea
        v-model="form.notes"
        label="Notes"
        :rows="3"
      />
    </form>
    <template #footer>
      <BaseButton
        variant="secondary"
        :icon="XMarkIcon"
        @click="emit('close')"
      >
        Cancel
      </BaseButton>
      <BaseButton
        :icon="CalendarDaysIcon"
        :loading="submitting"
        @click="emit('submit', { ...form })"
      >
        Schedule
      </BaseButton>
    </template>
  </BaseModal>
</template>
