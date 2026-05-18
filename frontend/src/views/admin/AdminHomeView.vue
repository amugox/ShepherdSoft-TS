<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { BuildingOfficeIcon, ShieldCheckIcon, WrenchScrewdriverIcon } from '@heroicons/vue/24/outline';

import { isSystemSuperAdminUser } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const isSuperAdmin = computed(() => isSystemSuperAdminUser(auth.user));

const sections = computed(() => [
  ...(isSuperAdmin.value
    ? [
        {
          title: 'Branches',
          description: 'Manage branches and open branch-specific user administration.',
          to: '/admin/branches',
          icon: BuildingOfficeIcon,
        },
      ]
    : []),
  {
    title: 'Admins',
    description: 'Manage system administrators, access, and reset workflows.',
    to: '/admin/admins',
    icon: ShieldCheckIcon,
  },
  {
    title: 'Security',
    description: 'Update password and security settings for the admin area.',
    to: '/admin/security',
    icon: WrenchScrewdriverIcon,
  },
]);
</script>

<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        Admin Dashboard
      </h1>
      <p class="text-sm text-slate-500">
        Start here to manage system settings and branch administration.
      </p>
    </header>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <RouterLink
        v-for="section in sections"
        :key="section.to"
        :to="section.to"
        class="card flex items-start gap-4 p-5 transition hover:border-brand-200 hover:bg-brand-50/40"
      >
        <div class="rounded-lg bg-brand-50 p-3 text-brand-700">
          <component
            :is="section.icon"
            class="h-6 w-6"
          />
        </div>
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-slate-900">
            {{ section.title }}
          </h2>
          <p class="text-sm text-slate-500">
            {{ section.description }}
          </p>
        </div>
      </RouterLink>
    </div>
  </section>
</template>
