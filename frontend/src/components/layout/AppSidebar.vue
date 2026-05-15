<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

import BrandLogo from '@/components/brand/BrandLogo.vue';
import { useAuthStore } from '@/stores/auth';

interface NavLinkItem {
  type: 'link';
  to: string;
  label: string;
  icon: string;
}

interface NavGroupChild {
  to: string;
  label: string;
}

interface NavGroupItem {
  type: 'group';
  id: string;
  label: string;
  icon: string;
  basePaths: string[];
  children: NavGroupChild[];
}

type NavItem = NavLinkItem | NavGroupItem;

const baseItems: NavItem[] = [
  { type: 'link', to: '/', label: 'Dashboard', icon: '🏠' },
  {
    type: 'group',
    id: 'guest',
    label: 'Guest',
    icon: '👥',
    basePaths: ['/guest'],
    children: [
      { to: '/guest', label: 'Guests' },
      { to: '/guest/register', label: 'Register Guest' },
      { to: '/guest/followups', label: 'Follow-ups' },
    ],
  },
  {
    type: 'group',
    id: 'membership',
    label: 'Membership',
    icon: '🧑',
    basePaths: ['/membership'],
    children: [
      { to: '/membership', label: 'Members' },
      { to: '/membership/fams', label: 'Families' },
      { to: '/membership/flsps', label: 'Fellowships' },
      { to: '/membership/groups', label: 'Member groups' },
    ],
  },
  { type: 'link', to: '/messaging', label: 'Messaging', icon: '💬' },
];

const auth = useAuthStore();
const route = useRoute();
const openGroups = ref<Record<string, boolean>>({});
const isAdmin = computed(() => (auth.user?.role ?? '').toLowerCase().includes('admin'));
const items = computed<NavItem[]>(() => [
  ...baseItems,
  ...(isAdmin.value ? [{ type: 'link', to: '/settings/security', label: 'Security', icon: '🔐' } satisfies NavLinkItem] : []),
]);

const groupedItems = computed(() => items.value.filter((item): item is NavGroupItem => item.type === 'group'));

const isPathActive = (path: string) => route.path === path || route.path.startsWith(`${path}/`);

const isGroupActive = (item: NavGroupItem) => item.basePaths.some((basePath) => isPathActive(basePath));

const toggleGroup = (id: string) => {
  openGroups.value[id] = !openGroups.value[id];
};

watch(
  () => route.path,
  () => {
    for (const item of groupedItems.value) {
      if (isGroupActive(item)) {
        openGroups.value[item.id] = true;
      }
    }
  },
  { immediate: true },
);
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
    <nav class="flex-1 overflow-y-auto py-2">
      <template
        v-for="item in items"
        :key="item.type === 'group' ? item.id : item.to"
      >
        <RouterLink
          v-if="item.type === 'link'"
          :to="item.to"
          class="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
          active-class="!bg-brand-50 !text-brand-700 font-medium"
        >
          <span class="w-5 text-center">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>

        <div
          v-else
          class="px-2 py-1"
        >
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm transition hover:bg-slate-50"
            :class="isGroupActive(item) ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700'"
            @click="toggleGroup(item.id)"
          >
            <span class="w-5 text-center">{{ item.icon }}</span>
            <span class="flex-1">{{ item.label }}</span>
            <span class="text-xs text-slate-500">{{ openGroups[item.id] ? '▾' : '▸' }}</span>
          </button>

          <div
            v-if="openGroups[item.id]"
            class="mt-1 space-y-1 pl-8"
          >
            <RouterLink
              v-for="child in item.children"
              :key="child.to"
              :to="child.to"
              class="block rounded-md px-2 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
              active-class="!bg-brand-50 !text-brand-700 font-medium"
            >
              {{ child.label }}
            </RouterLink>
          </div>
        </div>
      </template>
    </nav>
    <div class="border-t border-slate-200 p-3 text-xs text-slate-500">
      v0.1 — branch-user
    </div>
  </aside>
</template>
