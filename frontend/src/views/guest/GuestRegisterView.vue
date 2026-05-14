<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import type { Guest } from '@shepherd/shared';

import GuestForm from '@/components/domain/guest/GuestForm.vue';
import { guestApi } from '@/api/guest';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const toast = useToast();
const submitting = ref(false);

const onSubmit = async (g: Guest): Promise<void> => {
  submitting.value = true;
  try {
    await guestApi.add(g);
    toast.success('Guest registered.');
    await router.push('/guest');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to register guest.');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <section class="space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        Register guest
      </h1>
      <p class="text-sm text-slate-500">
        Capture a visitor's details. Fields marked * are required.
      </p>
    </header>
    <div class="card p-6">
      <GuestForm
        :submitting="submitting"
        @submit="onSubmit"
        @cancel="$router.back()"
      />
    </div>
  </section>
</template>
