import { storeToRefs } from 'pinia';

import { useAuthStore } from '@/stores/auth';

export const useAuth = (): ReturnType<typeof useAuthStore> & {
  user: ReturnType<typeof storeToRefs<ReturnType<typeof useAuthStore>>>['user'];
  isAuthenticated: ReturnType<typeof storeToRefs<ReturnType<typeof useAuthStore>>>['isAuthenticated'];
} => {
  const store = useAuthStore();
  const refs = storeToRefs(store);
  return Object.assign(store, { user: refs.user, isAuthenticated: refs.isAuthenticated });
};
