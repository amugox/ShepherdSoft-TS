<script setup lang="ts">
import { reactive } from 'vue';

import type { Family } from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';

defineProps<{ submitting?: boolean }>();

const emit = defineEmits<{
  (e: 'submit', family: Family): void;
  (e: 'cancel'): void;
}>();

const form = reactive<Family>({
  mcode: 0,
  fname: '',
});
</script>

<template>
  <form
    class="space-y-3"
    @submit.prevent="emit('submit', { ...form })"
  >
    <BaseInput
      v-model.number="form.mcode"
      type="number"
      label="Anchor member code"
      required
    />
    <BaseInput
      v-model="form.fname"
      label="Family name"
      required
    />
    <div class="flex justify-end gap-2">
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
        Save
      </BaseButton>
    </div>
  </form>
</template>
