import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import type { ChangePasswordPayload, UserData, UserLoginPayload } from '@shepherd/shared';

import { authApi } from '@/api/auth';
import { install401Handler } from '@/api/client';
import { router } from '@/router';
import { useGuestStore } from '@/stores/guest';
import { useMemberStore } from '@/stores/member';
import { useReferenceStore } from '@/stores/reference';

const STORAGE_KEY = 'shp:user';

// The JWT lives in an HttpOnly cookie — never persist it (or other token-like
// fields) to localStorage, where any XSS could read it.
const NON_PERSISTED_FIELDS = ['tkn', 'sno'] as const;

const stripSensitive = (data: UserData): Omit<UserData, (typeof NON_PERSISTED_FIELDS)[number]> => {
  const copy: Partial<UserData> = { ...data };
  for (const field of NON_PERSISTED_FIELDS) {
    delete copy[field];
  }
  return copy as Omit<UserData, (typeof NON_PERSISTED_FIELDS)[number]>;
};

const resetDependentStores = (): void => {
  useReferenceStore().invalidate();
  useGuestStore().reset();
  useMemberStore().reset();
};

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserData | null>(null);

  const isAuthenticated = computed(() => user.value !== null);
  const role = computed(() => user.value?.role ?? '');

  let handlerInstalled = false;
  const ensureUnauthorizedHandler = (): void => {
    if (handlerInstalled) return;
    handlerInstalled = true;
    install401Handler(() => {
      user.value = null;
      window.localStorage.removeItem(STORAGE_KEY);
      resetDependentStores();
      const current = router.currentRoute.value.fullPath;
      void router.push({ path: '/auth/login', query: { return: current } });
    });
  };

  const hydrateFromStorage = (): void => {
    ensureUnauthorizedHandler();
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        user.value = JSON.parse(raw) as UserData;
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  };

  const login = async (payload: UserLoginPayload): Promise<void> => {
    ensureUnauthorizedHandler();
    const data = await authApi.login(payload);
    user.value = data;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stripSensitive(data)));
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } catch {
      // Always proceed with client-side logout — the cookie may be expired.
    }
    user.value = null;
    window.localStorage.removeItem(STORAGE_KEY);
    resetDependentStores();
    await router.push('/auth/login');
  };

  const changePassword = async (payload: ChangePasswordPayload): Promise<void> => {
    await authApi.changePassword(payload);
    if (user.value) {
      user.value.cpass = false;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stripSensitive(user.value)));
    }
  };

  return {
    user,
    isAuthenticated,
    role,
    hydrateFromStorage,
    login,
    logout,
    changePassword,
  };
});
