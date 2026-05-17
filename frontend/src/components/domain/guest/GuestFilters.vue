<script setup lang="ts">
import { reactive, watch } from 'vue';

import {
  BornAgainStatus,
  FollowUpStatus,
  HeardVia,
  SpiritualStage,
  VisitType,
  type GuestFilter,
} from '@shepherd/shared';

import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { FunnelIcon } from '@heroicons/vue/24/outline';

const props = defineProps<{
  modelValue: GuestFilter;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', value: GuestFilter): void;
  (e: 'submit'): void;
}>();

const local = reactive<GuestFilter>({ ...props.modelValue });
watch(local, (v) => emit('update:modelValue', { ...v }), { deep: true });

const visitTypeOptions = [
  { value: VisitType.OneTime, label: 'One-time visit' },
  { value: VisitType.Joining, label: 'Joining' },
];
const stageOptions = [
  { value: SpiritualStage.New,       label: 'New' },
  { value: SpiritualStage.Growing,   label: 'Growing' },
  { value: SpiritualStage.Mature,    label: 'Mature' },
  { value: SpiritualStage.Exploring, label: 'Exploring' },
];
const fuStatusOptions = [
  { value: FollowUpStatus.Pending,   label: 'Pending' },
  { value: FollowUpStatus.Complete,  label: 'Complete' },
  { value: FollowUpStatus.Cancelled, label: 'Cancelled' },
];
const heardViaOptions = [
  { value: HeardVia.SocialMedia, label: 'Social media' },
  { value: HeardVia.SignPost,    label: 'Sign post' },
  { value: HeardVia.GoogleMap,   label: 'Google Maps' },
  { value: HeardVia.Invited,     label: 'Invited' },
  { value: HeardVia.Other,       label: 'Other' },
];
const bornAgainOptions = [
  { value: BornAgainStatus.Yes,     label: 'Yes' },
  { value: BornAgainStatus.No,      label: 'No' },
  { value: BornAgainStatus.Unknown, label: 'Unknown' },
];
</script>

<template>
  <form
    class="card space-y-3 p-4"
    @submit.prevent="emit('submit')"
  >
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <BaseInput
        v-model="local.stxt"
        label="Search"
        placeholder="Name, phone or email"
      />
      <BaseSelect
        v-model="local.vtype"
        label="Visit type"
        :options="visitTypeOptions"
      />
      <BaseSelect
        v-model="local.sstage"
        label="Spiritual stage"
        :options="stageOptions"
      />
      <BaseSelect
        v-model="local.fu_stat"
        label="Follow-up status"
        :options="fuStatusOptions"
      />
      <BaseInput
        v-model="local.vdt_from"
        type="date"
        label="Visit from"
      />
      <BaseInput
        v-model="local.vdt_to"
        type="date"
        label="Visit to"
      />
      <BaseSelect
        v-model="local.heard"
        label="Heard via"
        :options="heardViaOptions"
      />
      <BaseSelect
        v-model="local.ba"
        label="Born again"
        :options="bornAgainOptions"
      />
    </div>
    <div class="flex justify-end">
      <button
        class="btn-primary"
        type="submit"
      >
        <FunnelIcon class="h-4 w-4 shrink-0" />
        Filter
      </button>
    </div>
  </form>
</template>
