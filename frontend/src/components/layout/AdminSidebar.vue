<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import BrandLogo from '@/components/brand/BrandLogo.vue';
import { isSuperAdminRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const isSuperAdmin = computed(() => isSuperAdminRole(auth.user?.role));
</script>

<template>
  <aside class="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
    <RouterLink
      to="/"
      class="flex h-14 items-center border-b border-slate-200 px-4 transition hover:bg-slate-50"
      aria-label="ShepherdSoft - Church Management Software"
    >
      <BrandLogo variant="compact" />
    </RouterLink>

    <div class="border-b border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      Admin
    </div>

    <nav class="flex-1 overflow-y-auto py-2">
      <RouterLink
        to="/admin/admins"
        class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
        active-class="!bg-brand-50 !text-brand-700 font-medium"
      >
        <span class="w-5 text-center">🛡️</span>
        <span>Admins</span>
      </RouterLink>
      <RouterLink
        to="/admin/users"
        class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
        active-class="!bg-brand-50 !text-brand-700 font-medium"
      >
        <span class="w-5 text-center">🧑‍💼</span>
        <span>Branch Users</span>
      </RouterLink>
      <RouterLink
        v-if="isSuperAdmin"
        to="/admin/branches"
        class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
        active-class="!bg-brand-50 !text-brand-700 font-medium"
      >
        <span class="w-5 text-center">🏢</span>
        <span>Branches</span>
      </RouterLink>
      <RouterLink
        to="/admin/security"
        class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
        active-class="!bg-brand-50 !text-brand-700 font-medium"
      >
        <span class="w-5 text-center">🔐</span>
        <span>Security</span>
      </RouterLink>

      <div class="my-2 border-t border-slate-100" />

      <RouterLink
        to="/"
        class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
      >
        <span class="w-5 text-center">↩️</span>
        <span>Back to App</span>
      </RouterLink>
    </nav>
  </aside>
</template>
