<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { UserCircleIcon, ArrowLeftOnRectangleIcon } from '@heroicons/vue/24/outline';

import { useAuthStore } from '@/stores/auth';

const props = withDefaults(defineProps<{
  context?: 'app' | 'admin';
}>(), {
  context: 'app',
});

const auth = useAuthStore();
const router = useRouter();

const name = computed(() => auth.user?.fnames ?? auth.user?.uname ?? '');
const contextLabel = computed(() => (props.context === 'admin' ? 'Access' : 'Branch'));
const contextValue = computed(() => (props.context === 'admin' ? 'System Administration' : (auth.user?.br_name ?? '')));

const menuOpen = ref(false);
const menuContainer = ref<HTMLElement | null>(null);

const closeMenu = (): void => { menuOpen.value = false; };
const toggleMenu = (): void => { menuOpen.value = !menuOpen.value; };

const onClickOutside = (e: MouseEvent): void => {
  if (menuContainer.value && !menuContainer.value.contains(e.target as Node)) {
    closeMenu();
  }
};

onMounted(() => document.addEventListener('mousedown', onClickOutside));
onBeforeUnmount(() => document.removeEventListener('mousedown', onClickOutside));

const logout = async (): Promise<void> => {
  await auth.logout(props.context === 'admin' ? '/admin/auth/login' : '/auth/login');
};
const goProfile = (): Promise<unknown> => router.push(props.context === 'admin' ? '/admin/profile' : '/profile');
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
    <div class="flex items-center gap-3">
      <h1 class="text-sm font-medium text-slate-700">
        <span class="text-slate-500">{{ contextLabel }}:</span> {{ contextValue || '—' }}
      </h1>
    </div>
    <div class="flex items-center gap-3">
      <div class="text-right">
        <div class="text-sm font-medium text-slate-900">
          {{ name }}
        </div>
        <div class="text-xs text-slate-500">
          {{ auth.user?.uname ?? '' }}
        </div>
      </div>
      <div class="grid h-9 w-9 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
        {{ (name || '?')[0]?.toUpperCase() }}
      </div>
      <div
        ref="menuContainer"
        class="relative"
      >
        <button
          type="button"
          class="cursor-pointer rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
          @click.stop="toggleMenu"
        >
          ⋮
        </button>
        <div
          v-if="menuOpen"
          class="absolute right-0 z-30 mt-1 w-48 rounded-md border border-slate-200 bg-white shadow-lg"
        >
          <button
            class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-slate-50"
            @click="goProfile(); closeMenu()"
          >
            <UserCircleIcon class="h-4 w-4 shrink-0 text-slate-500" />
            My Profile
          </button>
          <button
            class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
            @click="logout(); closeMenu()"
          >
            <ArrowLeftOnRectangleIcon class="h-4 w-4 shrink-0" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  </header>
</template>
