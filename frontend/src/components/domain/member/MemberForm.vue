<script setup lang="ts">
import { onMounted, reactive } from 'vue';

import { Gender, type Member } from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import { todayLocal } from '@/lib/dates';
import { useAuthStore } from '@/stores/auth';
import { useReferenceStore } from '@/stores/reference';
import { XMarkIcon, CheckIcon } from '@heroicons/vue/24/outline';

const emit = defineEmits<{
  (e: 'submit', member: Member): void;
  (e: 'cancel'): void;
}>();

defineProps<{
  submitting?: boolean;
}>();

const reference = useReferenceStore();
const auth = useAuthStore();

const empty = (): Member => ({
  br_code: auth.user?.br_code ?? 0,
  fname:   '',
  onames:  '',
  cname:   '',
  pno:     '',
  email:   '',
  padd:    '',
  dob:     '',
  gdr:     undefined,
  grp:     undefined,
  jdt:     todayLocal(),
  rmk:     '',
});

const form = reactive<Member>(empty());

onMounted(async () => { await reference.loadAll(); });

const genderOptions = [
  { value: Gender.Male,   label: 'Male' },
  { value: Gender.Female, label: 'Female' },
];
</script>

<template>
  <form
    class="space-y-4"
    @submit.prevent="emit('submit', { ...form })"
  >
    <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
      <BaseInput
        v-model="form.fname"
        label="First name"
        required
      />
      <BaseInput
        v-model="form.onames"
        label="Other names"
      />
      <BaseInput
        v-model="form.cname"
        label="Common name"
      />
      <BaseInput
        v-model="form.pno"
        label="Phone"
      />
      <BaseInput
        v-model="form.email"
        type="email"
        label="Email"
      />
      <BaseInput
        v-model="form.padd"
        label="Address"
      />
      <BaseInput
        v-model="form.dob"
        type="date"
        label="Date of birth"
      />
      <BaseSelect
        v-model="form.gdr"
        label="Gender"
        :options="genderOptions"
      />
      <BaseSelect
        v-model="form.grp"
        label="Group"
        :options="reference.memberGroups.map((g) => ({ value: g.itemvalue, label: g.itemname }))"
      />
      <BaseInput
        v-model="form.jdt"
        type="date"
        label="Join date"
      />
    </div>
    <BaseTextarea
      v-model="form.rmk"
      label="Remarks"
      :rows="2"
    />
    <div class="flex justify-end gap-2">
      <BaseButton
        variant="secondary"
        type="button"
        :icon="XMarkIcon"
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <BaseButton
        type="submit"
        :icon="CheckIcon"
        :loading="submitting"
      >
        Save
      </BaseButton>
    </div>
  </form>
</template>
