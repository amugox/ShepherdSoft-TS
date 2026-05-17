<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';

import type { GuestFollowUpReschedulePayload } from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { todayLocal } from '@/lib/dates';
import { userApi } from '@/api/user';
import { XMarkIcon, CalendarDaysIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  open: boolean;
  followUpCode: number;
  currentDate?: string;
  currentAssignedTo?: number;
  submitting?: boolean;
}>();
const emit = defineEmits<{
  (e: 'submit', payload: GuestFollowUpReschedulePayload): void;
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
    // Gracefully degrade.
  }
});

const initial = (): { code: number; fdt: string; assigned_to?: number | null } => ({
  code:        props.followUpCode,
  fdt:         props.currentDate ?? todayLocal(),
  assigned_to: props.currentAssignedTo ?? null,
});

const form = reactive<{ code: number; fdt: string; assigned_to?: number | null }>(initial());

watch(() => props.followUpCode,     (v) => { form.code = v; });
watch(() => props.currentDate,      (v) => { form.fdt = v ?? todayLocal(); });
watch(() => props.currentAssignedTo, (v) => { form.assigned_to = v ?? null; });

const submit = (): void => {
  const payload: GuestFollowUpReschedulePayload = {
    code:        form.code,
    fdt:         form.fdt,
    assigned_to: form.assigned_to ?? undefined,
  };
  emit('submit', payload);
};
</script>

<template>
  <BaseModal
    :open="open"
    title="Reschedule follow-up"
    size="sm"
    @close="emit('close')"
  >
    <form
      class="space-y-3"
      @submit.prevent="submit"
    >
      <BaseInput
        v-model="form.fdt"
        type="date"
        label="New date"
        required
      />
      <BaseSelect
        v-if="userOptions.length > 0"
        v-model="form.assigned_to"
        label="Reassign to (optional)"
        :options="userOptions"
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
        @click="submit"
      >
        Reschedule
      </BaseButton>
    </template>
  </BaseModal>
</template>
