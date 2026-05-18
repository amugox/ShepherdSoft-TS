<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import type { UserProfileData } from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useToast } from '@/composables/useToast';
import { authApi } from '@/api/auth';
import { formatDateTime } from '@/lib/dates';
import { isSystemAdminUser } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';
import { KeyIcon } from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const toast = useToast();
const isSystemAdmin = computed(() => isSystemAdminUser(auth.user));

// — Profile data —
const profile = ref<UserProfileData | null>(null);
const loadingProfile = ref(false);

const loadProfile = async (): Promise<void> => {
  loadingProfile.value = true;
  try {
    const data = await authApi.getProfile();
    profile.value = data ?? null;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load profile.');
  } finally {
    loadingProfile.value = false;
  }
};

// — Change password —
const oldPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const savingPassword = ref(false);

const onChangePassword = async (): Promise<void> => {
  if (newPassword.value.length < 6) {
    toast.warning('New password must be at least 6 characters.');
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.warning('New password and confirmation do not match.');
    return;
  }
  savingPassword.value = true;
  try {
    await auth.changePassword({
      OldPassword: oldPassword.value,
      NewPassword: newPassword.value,
      ConfirmPassword: confirmPassword.value,
    });
    toast.success('Password changed successfully.');
    oldPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to change password.');
  } finally {
    savingPassword.value = false;
  }
};

onMounted(async () => {
  await loadProfile();
});
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        My Profile
      </h1>
      <p class="text-sm text-slate-500">
        View your account details and update your password.
      </p>
    </header>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <!-- Account Details -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h2 class="mb-4 text-sm font-semibold text-slate-900">
          Account Details
        </h2>

        <div
          v-if="loadingProfile"
          class="text-sm text-slate-500"
        >
          Loading…
        </div>

        <dl
          v-else-if="profile"
          class="grid grid-cols-1 gap-4"
        >
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              Username
            </dt>
            <dd class="mt-1 text-sm text-slate-900">
              {{ profile.user_name }}
            </dd>
          </div>

          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              Full Name
            </dt>
            <dd class="mt-1 text-sm text-slate-900">
              {{ profile.full_name || '—' }}
            </dd>
          </div>

          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              Email
            </dt>
            <dd class="mt-1 text-sm text-slate-900">
              {{ profile.email || '—' }}
            </dd>
          </div>

          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              Role
            </dt>
            <dd class="mt-1 text-sm text-slate-900">
              {{ profile.role || '—' }}
            </dd>
          </div>

          <div v-if="isSystemAdmin">
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              Access Scope
            </dt>
            <dd class="mt-1 text-sm text-slate-900">
              System Administration
            </dd>
          </div>

          <div v-else>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              Branch
            </dt>
            <dd class="mt-1 text-sm text-slate-900">
              {{ profile.branch_name || '—' }}
            </dd>
          </div>

          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-slate-500">
              Last Login
            </dt>
            <dd class="mt-1 text-sm text-slate-900">
              {{ profile.last_login ? formatDateTime(profile.last_login) : '—' }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Change Password -->
      <div class="rounded-xl border border-slate-200 bg-white p-5">
        <h2 class="mb-4 text-sm font-semibold text-slate-900">
          Change Password
        </h2>
        <form
          class="space-y-4"
          @submit.prevent="onChangePassword"
        >
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
          <div class="flex justify-end">
            <BaseButton
              type="submit"
              :icon="KeyIcon"
              :loading="savingPassword"
            >
              Update password
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>
