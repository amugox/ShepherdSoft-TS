<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { useReferenceStore } from '@/stores/reference';
import { ArrowRightOnRectangleIcon, ShieldCheckIcon, EnvelopeIcon, LockOpenIcon } from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const reference = useReferenceStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const username = ref('');
const password = ref('');
const branchCode = ref<number | null>(null);
const otpCode = ref('');
const submitting = ref(false);

const resetIdentifier = ref('');
const resetId = ref('');
const resetCode = ref('');
const resetPassword = ref('');
const resetConfirm = ref('');
const resetRequesting = ref(false);
const resetCompleting = ref(false);

const awaitingOtp = computed(() => Boolean(auth.otpChallenge));

onMounted(async () => {
  try {
    await reference.loadBranches();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load branches.');
  }
});

const navigateAfterLogin = async (): Promise<void> => {
  const raw = route.query.return;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const target = typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')
    ? candidate
    : '/';
  await router.push(target);
};

const onSubmit = async (): Promise<void> => {
  if (!username.value || !password.value || !branchCode.value) {
    toast.warning('Please fill in all fields.');
    return;
  }
  submitting.value = true;
  try {
    await auth.login({
      Username: username.value,
      Password: password.value,
      BranchCode: branchCode.value,
    });

    if (auth.otpChallenge) {
      toast.success(`OTP sent to ${auth.otpChallenge.maskedEmail ?? 'your email'}.`);
      return;
    }

    await navigateAfterLogin();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Login failed.');
  } finally {
    submitting.value = false;
  }
};

const onVerifyOtp = async (): Promise<void> => {
  if (!otpCode.value.trim()) {
    toast.warning('Enter the OTP code.');
    return;
  }
  submitting.value = true;
  try {
    await auth.verifyLoginOtp(otpCode.value.trim());
    if (auth.otpChallenge) {
      toast.warning('OTP verification failed. Request a new code by signing in again.');
      return;
    }
    await navigateAfterLogin();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'OTP verification failed.');
  } finally {
    submitting.value = false;
  }
};

const onRequestReset = async (): Promise<void> => {
  if (!resetIdentifier.value.trim()) {
    toast.warning('Enter your username or email.');
    return;
  }
  resetRequesting.value = true;
  try {
    await auth.requestPasswordReset({ userNameOrEmail: resetIdentifier.value.trim() });
    toast.success('If the account exists, a reset code has been sent.');
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
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to complete reset.');
  } finally {
    resetCompleting.value = false;
  }
};
</script>

<template>
  <div class="space-y-6">
    <form
      v-if="!awaitingOtp"
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <h1 class="text-lg font-semibold text-slate-900">
        Sign in
      </h1>
      <p class="text-sm text-slate-500">
        Use your branch credentials.
      </p>
      <BaseSelect
        v-model="branchCode"
        label="Branch"
        required
        :options="reference.branches.map((b) => ({ value: b.itemvalue, label: b.itemname }))"
      />
      <BaseInput
        v-model="username"
        label="Username"
        required
        autocomplete="username"
      />
      <BaseInput
        v-model="password"
        type="password"
        label="Password"
        required
        revealable
        autocomplete="current-password"
      />
      <BaseButton
        type="submit"
        class="w-full"
        :icon="ArrowRightOnRectangleIcon"
        :loading="submitting"
      >
        Sign in
      </BaseButton>
    </form>

    <form
      v-else
      class="space-y-4"
      @submit.prevent="onVerifyOtp"
    >
      <h1 class="text-lg font-semibold text-slate-900">
        Verify sign-in
      </h1>
      <p class="text-sm text-slate-500">
        Enter the OTP sent to {{ auth.otpChallenge?.maskedEmail ?? 'your email' }}.
      </p>
      <BaseInput
        v-model="otpCode"
        label="OTP code"
        required
      />
      <BaseButton
        type="submit"
        class="w-full"
        :icon="ShieldCheckIcon"
        :loading="submitting"
      >
        Verify OTP
      </BaseButton>
    </form>

    <section class="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 class="text-sm font-semibold text-slate-900">
        Forgot password?
      </h2>
      <BaseInput
        v-model="resetIdentifier"
        label="Username or email"
      />
      <BaseButton
        variant="secondary"
        :icon="EnvelopeIcon"
        :loading="resetRequesting"
        @click="onRequestReset"
      >
        Send reset code
      </BaseButton>

      <div class="mt-3 space-y-3 border-t border-slate-200 pt-3">
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
        <BaseButton
          variant="secondary"
          :icon="LockOpenIcon"
          :loading="resetCompleting"
          @click="onCompleteReset"
        >
          Complete reset
        </BaseButton>
      </div>
    </section>
  </div>
</template>
