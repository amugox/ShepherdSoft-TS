<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue';

import type { GuestPromotePayload } from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { todayLocal } from '@/lib/dates';
import { useReferenceStore } from '@/stores/reference';

const props = defineProps<{
  open: boolean;
  guestCode: number;
  defaultName?: string;
  submitting?: boolean;
}>();
const emit = defineEmits<{
  (e: 'submit', payload: GuestPromotePayload): void;
  (e: 'close'): void;
}>();

const reference = useReferenceStore();

const initial = (): GuestPromotePayload => ({
  g_code: props.guestCode,
  cname: props.defaultName ?? '',
  grp: 0,
  jdt: todayLocal(),
});
const form = reactive<GuestPromotePayload>(initial());
watch(() => props.guestCode, (v) => { form.g_code = v; });
watch(() => props.defaultName, (v) => { form.cname = v ?? ''; });

/** Strip empty `dob` so the backend doesn't receive an invalid empty-string date. */
const submitPayload = (): GuestPromotePayload => {
  const out: GuestPromotePayload = { ...form };
  if (!out.dob) delete out.dob;
  return out;
};

onMounted(async () => { await reference.loadAll(); });
</script>

<template>
  <BaseModal
    :open="open"
    title="Promote guest to member"
    size="md"
    @close="emit('close')"
  >
    <form
      class="space-y-3"
      @submit.prevent="emit('submit', submitPayload())"
    >
      <BaseInput
        v-model="form.cname"
        label="Common name"
        required
      />
      <BaseSelect
        v-model="form.grp"
        label="Member group"
        required
        :options="reference.memberGroups.map((g) => ({ value: g.itemvalue, label: g.itemname }))"
      />
      <BaseInput
        v-model="form.dob"
        type="date"
        label="Date of birth"
      />
      <BaseInput
        v-model="form.jdt"
        type="date"
        label="Join date"
        required
      />
    </form>
    <template #footer>
      <BaseButton
        variant="secondary"
        @click="emit('close')"
      >
        Cancel
      </BaseButton>
      <BaseButton
        :loading="submitting"
        @click="emit('submit', submitPayload())"
      >
        Promote
      </BaseButton>
    </template>
  </BaseModal>
</template>
