<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { EnvelopeIcon, LockOpenIcon } from '@heroicons/vue/24/outline';

const props = withDefaults(defineProps<{ adminOnly?: boolean }>(), {
  adminOnly: false,
});

const auth = useAuthStore();
const toast = useToast();

const resetIdentifier = ref('');
const resetId = ref('');
const resetCode = ref('');
const resetPassword = ref('');
const resetConfirm = ref('');
const resetRequesting = ref(false);
const resetCompleting = ref(false);
const resetStep = ref<'request' | 'complete'>('request');

const loginRoute = computed(() => (props.adminOnly ? '/admin/auth/login' : '/auth/login'));

const onRequestReset = async (): Promise<void> => {
  if (!resetIdentifier.value.trim()) {
    toast.warning('Enter your username or email.');
    return;
  }
  resetRequesting.value = true;
  try {
    await auth.requestPasswordReset({ userNameOrEmail: resetIdentifier.value.trim() });
    toast.success('If the account exists, a reset code has been sent.');
    resetStep.value = 'complete';
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to request reset.');
  } finally {
    resetRequesting.value = false;
  }
};

const onCompleteReset = async (): Promise<void> => {
  if (!resetId.value || !resetCode.value || !resetPassword.value || !resetConfirm.value) {
    toast.warning('Fill all reset fields.');
    return;
  }
  resetCompleting.value = true;
  try {
    await auth.completePasswordReset({
      resetId: resetId.value.trim(),
      code: resetCode.value.trim(),
      newPassword: resetPassword.value,
      confirmPassword: resetConfirm.value,
    });
    toast.success('Password reset complete. You can now sign in.');
    resetId.value = '';
    resetCode.value = '';
    resetPassword.value = '';
    resetConfirm.value = '';
    resetStep.value = 'request';
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to complete reset.');
  } finally {
    resetCompleting.value = false;
  }
};

const goToRequestStep = (): void => {
  resetStep.value = 'request';
};
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-semibold text-slate-900">
        Forgot password
      </h1>
      <p class="text-sm text-slate-500">
        Request a reset code, then set a new password.
      </p>
    </div>

    <form
      v-if="resetStep === 'request'"
      class="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      @submit.prevent="onRequestReset"
    >
      <BaseInput
        v-model="resetIdentifier"
        label="Username or email"
      />
      <BaseButton
        type="submit"
        variant="secondary"
        :icon="EnvelopeIcon"
        :loading="resetRequesting"
      >
        Send reset code
      </BaseButton>
    </form>

    <form
      v-else
      class="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
      @submit.prevent="onCompleteReset"
    >
      <p class="text-sm text-slate-500">
        Enter the reset ID and code from your email, then choose a new password.
      </p>
      <BaseInput
        v-model="resetId"
        label="Reset ID"
      />
      <BaseInput
        v-model="resetCode"
        label="Reset code"
      />
      <BaseInput
        v-model="resetPassword"
        type="password"
        label="New password"
      />
      <BaseInput
        v-model="resetConfirm"
        type="password"
        label="Confirm password"
      />
      <div class="flex flex-wrap items-center gap-2">
        <BaseButton
          type="submit"
          variant="secondary"
          :icon="LockOpenIcon"
          :loading="resetCompleting"
        >
          Complete reset
        </BaseButton>
        <BaseButton
          type="button"
          variant="ghost"
          @click="goToRequestStep"
        >
          Request a new code
        </BaseButton>
      </div>
    </form>

    <RouterLink
      :to="loginRoute"
      class="block text-sm font-medium text-brand-700 hover:underline"
    >
      Back to sign in
    </RouterLink>
  </div>
</template>
