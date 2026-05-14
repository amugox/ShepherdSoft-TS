<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useToast } from '@/composables/useToast';
import { useAuthStore } from '@/stores/auth';
import { useReferenceStore } from '@/stores/reference';

const auth = useAuthStore();
const reference = useReferenceStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const username = ref('');
const password = ref('');
const branchCode = ref<number | null>(null);
const submitting = ref(false);

onMounted(async () => {
  try {
    await reference.loadBranches();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load branches.');
  }
});

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
    const raw = route.query.return;
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    // Only honour same-origin paths — prevents open-redirect via crafted `return=//evil.com`.
    const target = typeof candidate === 'string' && candidate.startsWith('/') && !candidate.startsWith('//')
      ? candidate
      : '/';
    await router.push(target);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Login failed.');
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
      autocomplete="current-password"
    />
    <BaseButton
      type="submit"
      class="w-full"
      :loading="submitting"
    >
      Sign in
    </BaseButton>
  </form>
</template>
