<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { UserCircleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/vue/24/outline';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const name = computed(() => auth.user?.fnames ?? auth.user?.uname ?? '');
const branch = computed(() => auth.user?.br_name ?? '');

const logout = async (): Promise<void> => {
  await auth.logout();
};
const goProfile = (): Promise<unknown> => router.push('/profile');
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
    <div class="flex items-center gap-3">
      <h1 class="text-sm font-medium text-slate-700">
        <span class="text-slate-500">Branch:</span> {{ branch || '—' }}
      </h1>
    </div>
    <div class="flex items-center gap-3">
      <div class="text-right">
        <div class="text-sm font-medium text-slate-900">
          {{ name }}
        </div>
        <div class="text-xs text-slate-500">
          {{ auth.user?.role ?? '' }}
        </div>
      </div>
      <div class="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
        {{ (name || '?')[0]?.toUpperCase() }}
      </div>
      <div class="relative">
        <details class="group">
          <summary class="cursor-pointer list-none rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100">
            ⋮
          </summary>
          <div class="absolute right-0 z-30 mt-1 w-48 rounded-md border border-slate-200 bg-white shadow-lg">
            <button
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50"
              @click="goProfile"
            >
              <UserCircleIcon class="h-4 w-4 shrink-0 text-slate-500" />
              My Profile
            </button>
            <button
              class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
              @click="logout"
            >
              <ArrowLeftOnRectangleIcon class="h-4 w-4 shrink-0" />
              Sign out
            </button>
          </div>
        </details>
      </div>
    </div>
  </header>
</template>
