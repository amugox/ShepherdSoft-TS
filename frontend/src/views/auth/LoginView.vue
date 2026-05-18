<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useToast } from '@/composables/useToast';
import { isSystemAdminUser } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';
import { useReferenceStore } from '@/stores/reference';
import { ArrowRightOnRectangleIcon, ShieldCheckIcon } from '@heroicons/vue/24/outline';

const props = withDefaults(defineProps<{ adminOnly?: boolean }>(), {
  adminOnly: false,
});

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

const awaitingOtp = computed(() => Boolean(auth.otpChallenge));
const forgotPasswordRoute = computed(() => (props.adminOnly ? '/admin/auth/forgot-password' : '/auth/forgot-password'));

onMounted(async () => {
  if (props.adminOnly) return;
  try {
    await reference.loadBranches();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load branches.');
  }
});

const navigateAfterLogin = async (): Promise<void> => {
  const raw = route.query.return;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  const validCandidate = typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//');
  const target = props.adminOnly
    ? (validCandidate && candidate.startsWith('/admin') ? candidate : '/admin')
    : (validCandidate ? candidate : '/');
  await router.push(target);
};

const onSubmit = async (): Promise<void> => {
  if (!username.value || !password.value || (!props.adminOnly && !branchCode.value)) {
    toast.warning('Please fill in all fields.');
    return;
  }
  submitting.value = true;
  try {
    await auth.login({
      Username: username.value,
      Password: password.value,
      BranchCode: props.adminOnly ? undefined : (branchCode.value ?? undefined),
      AdminOnly: props.adminOnly,
    });

    if (auth.otpChallenge) {
      toast.success(`OTP sent to ${auth.otpChallenge.maskedEmail ?? 'your email'}.`);
      return;
    }
    if (props.adminOnly && !isSystemAdminUser(auth.user)) {
      toast.error('This account does not have admin access.');
      await auth.logout('/admin/auth/login');
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

</script>

<template>
  <div class="space-y-6">
    <form
      v-if="!awaitingOtp"
      class="space-y-4"
      @submit.prevent="onSubmit"
    >
      <h1 class="text-lg font-semibold text-slate-900">
        {{ props.adminOnly ? 'Admin sign in' : 'Sign in' }}
      </h1>
      <p class="text-sm text-slate-500">
        {{ props.adminOnly ? 'Use admin credentials to access the admin area.' : 'Use your branch credentials.' }}
      </p>
      <BaseSelect
        v-if="!props.adminOnly"
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
      <RouterLink
        :to="forgotPasswordRoute"
        class="block text-right text-sm font-medium text-brand-700 hover:underline"
      >
        Forgot password?
      </RouterLink>
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
  </div>
</template>
