import { defineStore } from 'pinia';
import { ref } from 'vue';

import type { Family, Member } from '@shepherd/shared';

import { memberApi } from '@/api/member';
import { usePagination } from '@/composables/usePagination';

export const useMemberStore = defineStore('member', () => {
  const members = ref<Member[]>([]);
  const families = ref<Family[]>([]);
  const loading = ref(false);

  const membersPg = usePagination();
  const familiesPg = usePagination();
  const memberSearch = ref('');
  const familySearch = ref('');

  /** Pass search text to apply a new search (resets to page 1); omit it to re-fetch the current page. */
  const find = async (searchText?: string): Promise<void> => {
    if (searchText !== undefined) {
      memberSearch.value = searchText;
      membersPg.reset();
    }
    loading.value = true;
    try {
      const result = await memberApi.find({
        stxt: memberSearch.value,
        page: membersPg.page.value,
        pageSize: membersPg.pageSize.value,
      });
      members.value = result?.rows ?? [];
      membersPg.total.value = result?.total ?? 0;
    } finally {
      loading.value = false;
    }
  };

  const findFamilies = async (searchText?: string): Promise<void> => {
    if (searchText !== undefined) {
      familySearch.value = searchText;
      familiesPg.reset();
    }
    loading.value = true;
    try {
      const result = await memberApi.famFind({
        stxt: familySearch.value,
        page: familiesPg.page.value,
        pageSize: familiesPg.pageSize.value,
      });
      families.value = result?.rows ?? [];
      familiesPg.total.value = result?.total ?? 0;
    } finally {
      loading.value = false;
    }
  };

  const reset = (): void => {
    members.value = [];
    families.value = [];
    loading.value = false;
    memberSearch.value = '';
    familySearch.value = '';
    membersPg.reset();
    familiesPg.reset();
  };

  return {
    members,
    families,
    loading,
    membersPage: membersPg.page,
    membersPageSize: membersPg.pageSize,
    membersTotal: membersPg.total,
    familiesPage: familiesPg.page,
    familiesPageSize: familiesPg.pageSize,
    familiesTotal: familiesPg.total,
    find,
    findFamilies,
    reset,
  };
});
