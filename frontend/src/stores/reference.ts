import { defineStore } from 'pinia';
import { ref } from 'vue';

import {
  ListGroupType,
  ListItemType,
  type ListGroupItem,
  type ListItem,
} from '@shepherd/shared';

import { dataApi } from '@/api/data';

interface State {
  branches: ListItem[];
  memberGroups: ListItem[];
  guestForm: ListGroupItem[];
  createMember: ListGroupItem[];
}

export const useReferenceStore = defineStore('reference', () => {
  const branches = ref<ListItem[]>([]);
  const memberGroups = ref<ListItem[]>([]);
  const guestForm = ref<ListGroupItem[]>([]);
  const createMember = ref<ListGroupItem[]>([]);

  let loadedOnce = false;

  const loadAll = async (): Promise<void> => {
    if (loadedOnce) return;
    const [b, g, gf, cm] = await Promise.all([
      dataApi.getList(ListItemType.Branch),
      dataApi.getList(ListItemType.MemberGroup),
      dataApi.getListGroup(ListGroupType.AddGuest),
      dataApi.getListGroup(ListGroupType.CreateMember),
    ]);
    branches.value = b ?? [];
    memberGroups.value = g ?? [];
    guestForm.value = gf ?? [];
    createMember.value = cm ?? [];
    loadedOnce = true;
  };

  const loadBranches = async (): Promise<void> => {
    if (branches.value.length > 0) return;
    branches.value = (await dataApi.getList(ListItemType.Branch)) ?? [];
  };

  const invalidate = (): void => {
    loadedOnce = false;
    branches.value = [];
    memberGroups.value = [];
    guestForm.value = [];
    createMember.value = [];
  };

  const guestFormGroup = (code: number): ListGroupItem[] =>
    guestForm.value.filter((i) => i.groupcode === code);

  const createMemberGroup = (code: number): ListGroupItem[] =>
    createMember.value.filter((i) => i.groupcode === code);

  return {
    branches,
    memberGroups,
    guestForm,
    createMember,
    loadAll,
    loadBranches,
    invalidate,
    guestFormGroup,
    createMemberGroup,
  } satisfies Record<keyof State, unknown> & Record<string, unknown>;
});
