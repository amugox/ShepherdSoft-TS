<script setup lang="ts">
import { onMounted, reactive } from 'vue';

import {
  BornAgainStatus,
  Gender,
  HeardVia,
  SpiritualStage,
  VisitType,
  type Guest,
} from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import { todayLocal } from '@/lib/dates';
import { useReferenceStore } from '@/stores/reference';

const emit = defineEmits<{
  (e: 'submit', guest: Guest): void;
  (e: 'cancel'): void;
}>();

defineProps<{
  submitting?: boolean;
}>();

const reference = useReferenceStore();

const empty = (): Guest => ({
  fname:     '',
  onames:    '',
  pno:       '',
  email:     '',
  gdr:       undefined,
  padd:      '',
  vdt:       todayLocal(),
  vtype:     VisitType.OneTime,
  heard:     undefined,
  heard_rmk: '',
  porigin:   '',
  ba:        BornAgainStatus.Unknown,
  sstage:    SpiritualStage.Unknown,
  grp_code:  undefined,
  ministry:  '',
  oref:      '',
  remarks:   '',
  feedback:  '',
  followup:  false,
  returning: false,
});

const form = reactive<Guest>(empty());

onMounted(async () => {
  await reference.loadAll();
});

const reset = (): void => {
  Object.assign(form, empty());
};

// Parent calls `formRef.reset()` after a successful submit so that submission
// failure doesn't wipe the user's input.
defineExpose({ reset });

const onSubmit = (): void => {
  emit('submit', { ...form });
};

const genderOptions = [
  { value: Gender.Male,   label: 'Male' },
  { value: Gender.Female, label: 'Female' },
];
const visitTypeOptions = [
  { value: VisitType.OneTime, label: 'One-time visit' },
  { value: VisitType.Joining, label: 'Joining' },
];
const bornAgainOptions = [
  { value: BornAgainStatus.Yes,     label: 'Yes' },
  { value: BornAgainStatus.No,      label: 'No' },
  { value: BornAgainStatus.Unknown, label: 'Unknown' },
];
const stageOptions = [
  { value: SpiritualStage.New,       label: 'New' },
  { value: SpiritualStage.Growing,   label: 'Growing' },
  { value: SpiritualStage.Mature,    label: 'Mature' },
  { value: SpiritualStage.Exploring, label: 'Exploring' },
];
const heardViaOptions = [
  { value: HeardVia.SocialMedia, label: 'Social media' },
  { value: HeardVia.SignPost,    label: 'Sign post' },
  { value: HeardVia.GoogleMap,   label: 'Google Maps' },
  { value: HeardVia.Invited,     label: 'Invited' },
  { value: HeardVia.Other,       label: 'Other' },
];
</script>

<template>
  <form
    class="space-y-6"
    @submit.prevent="onSubmit"
  >
    <section>
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Contact
      </h3>
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
        <BaseSelect
          v-model="form.gdr"
          label="Gender"
          :options="genderOptions"
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
          label="Location"
        />
      </div>
    </section>

    <section>
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Visit
      </h3>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <BaseInput
          v-model="form.vdt"
          type="date"
          label="Visit date"
          required
        />
        <BaseSelect
          v-model="form.vtype"
          label="Visit type"
          required
          :options="visitTypeOptions"
        />
        <BaseSelect
          v-model="form.grp_code"
          label="Group / ministry"
          :options="reference.guestFormGroup(2).map((g) => ({ value: g.itemvalue, label: g.itemname }))"
        />
        <BaseInput
          v-model="form.ministry"
          label="Ministry of interest"
        />
        <BaseSelect
          v-model="form.heard"
          label="How did you hear?"
          :options="heardViaOptions"
        />
        <BaseInput
          v-model="form.heard_rmk"
          label="Referral details"
        />
      </div>
    </section>

    <section>
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Spiritual background
      </h3>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
        <BaseSelect
          v-model="form.ba"
          label="Born again?"
          :options="bornAgainOptions"
        />
        <BaseSelect
          v-model="form.sstage"
          label="Spiritual stage"
          :options="stageOptions"
        />
        <BaseInput
          v-model="form.porigin"
          label="Church of origin"
        />
      </div>
      <BaseTextarea
        v-model="form.oref"
        label="Pastor / contact info"
        :rows="2"
        class="mt-3"
      />
    </section>

    <section>
      <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-600">
        Feedback &amp; notes
      </h3>
      <BaseTextarea
        v-model="form.feedback"
        label="Any feedback?"
        :rows="3"
        :maxlength="500"
      />
      <BaseTextarea
        v-model="form.remarks"
        label="Internal comments"
        :rows="2"
        class="mt-3"
      />
      <label class="mt-3 inline-flex items-center gap-2 text-sm text-slate-700">
        <input
          v-model="form.followup"
          type="checkbox"
          class="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        >
        Schedule a follow-up
      </label>
    </section>

    <div class="flex justify-end gap-2 pt-2">
      <BaseButton
        variant="secondary"
        type="button"
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <BaseButton
        type="submit"
        :loading="submitting"
      >
        Save guest
      </BaseButton>
    </div>
  </form>
</template>
