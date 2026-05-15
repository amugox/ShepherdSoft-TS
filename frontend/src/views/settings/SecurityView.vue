<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import BaseButton from '@/components/ui/BaseButton.vue';
import { useToast } from '@/composables/useToast';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/stores/auth';

const toast = useToast();
const auth = useAuthStore();

const loading = ref(false);
const saving = ref(false);
const enabled = ref(false);
const loaded = ref(false);

const isAdmin = computed(() => (auth.user?.role ?? '').toLowerCase().includes('admin'));

const loadState = async (): Promise<void> => {
  loading.value = true;
  try {
    const state = await authApi.getSystem2FaState();
    enabled.value = Boolean(state?.enabled);
    loaded.value = true;
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load system security settings.');
  } finally {
    loading.value = false;
  }
};

const save = async (): Promise<void> => {
  if (!isAdmin.value) {
    toast.error('Only administrators can update system 2FA settings.');
    return;
  }
  saving.value = true;
  try {
    const state = await authApi.setSystem2FaState({ enabled: enabled.value });
    enabled.value = Boolean(state?.enabled);
    toast.success('System-wide 2FA setting updated.');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update system 2FA setting.');
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await loadState();
});
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        Security Settings
      </h1>
      <p class="text-sm text-slate-500">
        Configure system-wide authentication settings.
      </p>
    </header>

    <div class="rounded-xl border border-slate-200 bg-white p-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-sm font-semibold text-slate-900">
            System-wide 2FA
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            When enabled, two-factor authentication is turned on for the whole system.
          </p>
        </div>

        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            v-model="enabled"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            :disabled="loading || saving || !isAdmin"
          >
          Enabled
        </label>
      </div>

      <div class="mt-4 flex justify-end">
        <BaseButton
          :disabled="loading || saving || !loaded || !isAdmin"
          :loading="saving"
          @click="save"
        >
          Save
        </BaseButton>
      </div>

      <p
        v-if="!isAdmin"
        class="mt-3 text-xs text-amber-700"
      >
        You can view this value, but only administrators can change it.
      </p>
    </div>
  </section>
</template>
