<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { KeyIcon } from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const router = useRouter();
const toast = useToast();

const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const submitting = ref(false);

const onSubmit = async (): Promise<void> => {
  if (newPassword.value.length < 6) {
    toast.warning('New password must be at least 6 characters.');
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.warning('New password and confirmation do not match.');
    return;
  }
  submitting.value = true;
  try {
    await auth.changePassword({
      OldPassword: oldPassword.value,
      NewPassword: newPassword.value,
      ConfirmPassword: confirmPassword.value,
    });
    toast.success('Password changed successfully.');
    await router.push('/');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to change password.');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <form
    class="space-y-4"
    @submit.prevent="onSubmit"
  >
    <h1 class="text-lg font-semibold text-slate-900">
      Change password
    </h1>
    <BaseInput
      v-model="oldPassword"
      type="password"
      label="Current password"
      required
      autocomplete="current-password"
    />
    <BaseInput
      v-model="newPassword"
      type="password"
      label="New password"
      required
      autocomplete="new-password"
    />
    <BaseInput
      v-model="confirmPassword"
      type="password"
      label="Confirm new password"
      required
      autocomplete="new-password"
    />
    <BaseButton
      type="submit"
      :icon="KeyIcon"
      :loading="submitting"
    >
      Update password
    </BaseButton>
  </form>
</template>
