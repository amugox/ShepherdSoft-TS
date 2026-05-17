<script setup lang="ts">
import { reactive, watch } from 'vue';

import {
  FollowUpStatus,
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
  { value: SpiritualStage.New, label: 'New' },
  { value: SpiritualStage.Growing, label: 'Growing' },
  { value: SpiritualStage.Mature, label: 'Mature' },
  { value: SpiritualStage.Exploring, label: 'Exploring' },
];
const fuStatusOptions = [
  { value: FollowUpStatus.Pending, label: 'Pending' },
  { value: FollowUpStatus.Complete, label: 'Complete' },
  { value: FollowUpStatus.Cancelled, label: 'Cancelled' },
];
</script>

<template>
  <form
    class="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5"
    @submit.prevent="emit('submit')"
  >
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
    <div class="flex items-end">
      <button
        class="btn-primary w-full"
        type="submit"
      >
        <FunnelIcon class="h-4 w-4 shrink-0" />
        Filter
      </button>
    </div>
  </form>
</template>
