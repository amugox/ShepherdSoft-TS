import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { Family, Member } from '@shepherd/shared';

import { memberApi } from '@/api/member';

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([]);
  const families = ref<Family[]>([]);
  const loading = ref(false);

  const find = async (searchText = ''): Promise<void> => {
    loading.value = true;
    try {
      members.value = (await memberApi.find(searchText)) ?? [];
    } finally {
      loading.value = false;
    }
  };

  const findFamilies = async (searchText = ''): Promise<void> => {
    loading.value = true;
    try {
      families.value = (await memberApi.famFind(searchText)) ?? [];
    } finally {
      loading.value = false;
    }
  };

  const reset = (): void => {
    members.value = [];
    families.value = [];
    loading.value = false;
  };

  return { members, families, loading, find, findFamilies, reset };
});
