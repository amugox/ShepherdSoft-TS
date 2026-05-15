<script setup lang="ts">
import { RouterLink } from 'vue-router';

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const items: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: '🏠' },
  { to: '/guest', label: 'Guests', icon: '👥' },
  { to: '/guest/register', label: 'Register Guest', icon: '➕' },
  { to: '/guest/followups', label: 'Follow-ups', icon: '📞' },
  { to: '/membership', label: 'Members', icon: '🧑' },
  { to: '/membership/fams', label: 'Families', icon: '🏡' },
  { to: '/membership/flsps', label: 'Fellowships', icon: '🤝' },
  { to: '/membership/groups', label: 'Member groups', icon: '🗂' },
  { to: '/messaging', label: 'Messaging', icon: '💬' },
];
</script>

<template>
  <aside class="flex h-full w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
    <div class="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
      <div class="grid h-8 w-8 place-items-center rounded-md bg-brand-600 text-sm font-bold text-white">
        S
      </div>
      <span class="text-sm font-semibold text-slate-900">ShepherdSoft</span>
    </div>
    <nav class="flex-1 overflow-y-auto py-2">
      <RouterLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
        active-class="!bg-brand-50 !text-brand-700 font-medium"
      >
        <span class="w-5 text-center">{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>
    </nav>
    <div class="border-t border-slate-200 p-3 text-xs text-slate-500">
      v0.1 — branch-user
    </div>
  </aside>
</template>
