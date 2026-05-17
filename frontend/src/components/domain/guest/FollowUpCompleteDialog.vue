<script setup lang="ts">
import { reactive, watch } from 'vue';

import type { GuestFollowUpCompletePayload } from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  open: boolean;
  followUpCode: number;
  submitting?: boolean;
}>();
const emit = defineEmits<{
  (e: 'submit', payload: GuestFollowUpCompletePayload): void;
  (e: 'close'): void;
}>();

const form = reactive<GuestFollowUpCompletePayload>({
  code: props.followUpCode,
  responded: true,
  outcome: '',
});
watch(() => props.followUpCode, (v) => { form.code = v; });
</script>

<template>
  <BaseModal
    :open="open"
    title="Complete follow-up"
    size="md"
    @close="emit('close')"
  >
    <form
      class="space-y-3"
      @submit.prevent="emit('submit', { ...form })"
    >
      <label class="inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          v-model="form.responded"
          type="checkbox"
          class="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        >
        Guest responded
      </label>
      <BaseTextarea
        v-model="form.outcome"
        label="Outcome / notes"
        :rows="3"
        :maxlength="500"
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
        :icon="CheckCircleIcon"
        :loading="submitting"
        @click="emit('submit', { ...form })"
      >
        Mark complete
      </BaseButton>
    </template>
  </BaseModal>
</template>
