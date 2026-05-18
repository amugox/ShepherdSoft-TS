<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import type { BranchAdminRecord, UserAdminRecord, UserRoleItem } from '@shepherd/shared';

import { adminApi } from '@/api/admin';
import BaseButton from '@/components/ui/BaseButton.vue';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { useToast } from '@/composables/useToast';
import { UserPlusIcon, MagnifyingGlassIcon, PencilSquareIcon, EnvelopeIcon, NoSymbolIcon, CheckIcon } from '@heroicons/vue/24/outline';

const toast = useToast();
const route = useRoute();

const loading = ref(false);
const saving = ref(false);

const users = ref<UserAdminRecord[]>([]);
const roles = ref<UserRoleItem[]>([]);
const branches = ref<BranchAdminRecord[]>([]);

const filters = ref({
  searchText: '',
  branchCode: 0,
  roleCode: 0,
  includeInactive: true,
});

const createOpen = ref(false);
const editOpen = ref(false);

const createForm = ref({
  br_code: null as number | null,
  user_name: '',
  member_code: '',
  email: '',
  user_role: null as number | null,
  sendReset: true,
});

const editForm = ref({
  user_code: 0,
  br_code: null as number | null,
  member_code: '',
  email: '',
  user_role: null as number | null,
  user_stat: 0,
});

const roleOptions = computed(() => roles.value.map((r) => ({ value: r.code, label: r.name })));
const branchOptions = computed(() => branches.value.map((b) => ({ value: b.br_code, label: b.br_name })));
const selectedBranch = computed(() =>
  branches.value.find((branch) => branch.br_code === filters.value.branchCode),
);

const breadcrumb = computed(() => {
  const base = [{ label: 'Admin', to: '/admin' }];
  if (filters.value.branchCode > 0 && selectedBranch.value) {
    return [
      ...base,
      { label: 'Branches', to: '/admin/branches' },
      { label: selectedBranch.value.br_name },
    ];
  }
  return [...base, { label: 'Branch Users' }];
});

const parseBranchCode = (value: unknown): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
};

const syncBranchFilterFromRoute = (): void => {
  filters.value.branchCode = parseBranchCode(route.query.branchCode);
};

const loadLookups = async (): Promise<void> => {
  const [roleData, branchData] = await Promise.all([
    adminApi.listRoles(),
    adminApi.listBranches({ includeInactive: true }),
  ]);
  roles.value = roleData ?? [];
  branches.value = branchData ?? [];
};

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    users.value = (await adminApi.listBranchUsers({
      searchText: filters.value.searchText.trim(),
      branchCode: filters.value.branchCode > 0 ? filters.value.branchCode : undefined,
      roleCode: filters.value.roleCode > 0 ? filters.value.roleCode : undefined,
      includeInactive: filters.value.includeInactive,
    })) ?? [];
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load branch users.');
  } finally {
    loading.value = false;
  }
};

const resetCreateForm = (): void => {
  createForm.value = {
    br_code: null,
    user_name: '',
    member_code: '',
    email: '',
    user_role: null,
    sendReset: true,
  };
};

const openEdit = (row: UserAdminRecord): void => {
  editForm.value = {
    user_code: row.user_code,
    br_code: row.br_code,
    member_code: String(row.member_code ?? ''),
    email: row.email ?? '',
    user_role: row.user_role,
    user_stat: row.user_stat,
  };
  editOpen.value = true;
};

const submitCreate = async (): Promise<void> => {
  if (
    !createForm.value.user_name
    || !createForm.value.member_code
    || !createForm.value.email
    || createForm.value.user_role === null
    || !createForm.value.br_code
  ) {
    toast.warning('Fill all required fields.');
    return;
  }
  saving.value = true;
  try {
    await adminApi.createBranchUser({
      br_code: createForm.value.br_code ?? undefined,
      user_name: createForm.value.user_name.trim(),
      member_code: Number(createForm.value.member_code),
      email: createForm.value.email.trim(),
      user_role: Number(createForm.value.user_role),
      sendReset: createForm.value.sendReset,
    });
    createOpen.value = false;
    resetCreateForm();
    toast.success('Branch user created.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create branch user.');
  } finally {
    saving.value = false;
  }
};

const submitEdit = async (): Promise<void> => {
  if (
    !editForm.value.user_code
    || !editForm.value.member_code
    || editForm.value.user_role === null
    || !editForm.value.br_code
  ) {
    toast.warning('Fill all required fields.');
    return;
  }
  saving.value = true;
  try {
    await adminApi.updateBranchUser({
      user_code: editForm.value.user_code,
      br_code: editForm.value.br_code ?? undefined,
      member_code: Number(editForm.value.member_code),
      email: editForm.value.email.trim(),
      user_role: Number(editForm.value.user_role),
      user_stat: Number(editForm.value.user_stat),
    });
    editOpen.value = false;
    toast.success('Branch user updated.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update branch user.');
  } finally {
    saving.value = false;
  }
};

const deactivate = async (row: UserAdminRecord): Promise<void> => {
  try {
    await adminApi.deactivateBranchUser({ user_code: row.user_code });
    toast.success('Branch user deactivated.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to deactivate branch user.');
  }
};

const sendReset = async (row: UserAdminRecord): Promise<void> => {
  try {
    await adminApi.triggerBranchUserReset(row.user_code);
    toast.success('Reset code sent.');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to send reset code.');
  }
};

onMounted(async () => {
  try {
    await loadLookups();
    syncBranchFilterFromRoute();
    resetCreateForm();
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to initialize admin users page.');
  }
});

watch(
  () => route.query.branchCode,
  async () => {
    syncBranchFilterFromRoute();
    await load();
  },
);
</script>

<template>
  <section class="space-y-4">
    <BreadcrumbNav :items="breadcrumb" />
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          Branch User Management
        </h1>
        <p class="text-sm text-slate-500">
          Manage branch users, roles, account status, and password reset flow.
        </p>
        <p
          v-if="selectedBranch"
          class="text-sm font-medium text-brand-700"
        >
          Showing users for {{ selectedBranch.br_name }}.
        </p>
      </div>
      <BaseButton
        :icon="UserPlusIcon"
        @click="createOpen = true"
      >
        Add branch user
      </BaseButton>
    </header>

    <form
      class="grid grid-cols-1 gap-2 md:grid-cols-5"
      @submit.prevent="load"
    >
      <BaseInput
        v-model="filters.searchText"
        label="Search"
        placeholder="Username, name or email"
        class="md:col-span-2"
      />
      <BaseSelect
        v-model="filters.branchCode"
        label="Branch"
        :options="[{ value: 0, label: 'All branches' }, ...branchOptions]"
      />
      <BaseSelect
        v-model="filters.roleCode"
        label="Role"
        :options="[{ value: 0, label: 'All roles' }, ...roleOptions]"
      />
      <div class="flex items-end">
        <BaseButton
          variant="secondary"
          type="submit"
          :icon="MagnifyingGlassIcon"
          class="w-full"
        >
          Search
        </BaseButton>
      </div>
    </form>

    <label class="inline-flex items-center gap-2 text-sm text-slate-700">
      <input
        v-model="filters.includeInactive"
        type="checkbox"
        class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      >
      Include inactive users
    </label>

    <DataTable
      :rows="users"
      :columns="[
        { key: 'user_name', label: 'Username' },
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'br_name', label: 'Branch' },
        { key: 'role_name', label: 'Role', width: '140px' },
        { key: 'user_stat', label: 'Status', width: '100px' },
        { key: 'actions', label: 'Actions', width: '250px' },
      ]"
      :loading="loading"
      empty-text="No users found."
    >
      <template #user_stat="{ row }">
        <span :class="row.user_stat === 0 ? 'text-emerald-700' : 'text-rose-700'">
          {{ row.user_stat === 0 ? 'Active' : 'Inactive' }}
        </span>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-2">
          <BaseButton
            variant="secondary"
            :icon="PencilSquareIcon"
            @click.stop="openEdit(row)"
          >
            Edit
          </BaseButton>
          <BaseButton
            variant="secondary"
            :icon="EnvelopeIcon"
            @click.stop="sendReset(row)"
          >
            Send reset
          </BaseButton>
          <BaseButton
            variant="danger"
            :icon="NoSymbolIcon"
            :disabled="row.user_stat !== 0"
            @click.stop="deactivate(row)"
          >
            Deactivate
          </BaseButton>
        </div>
      </template>
    </DataTable>

    <BaseModal
      :open="createOpen"
      title="Create branch user"
      @close="createOpen = false"
    >
      <div class="space-y-3">
        <BaseSelect
          v-model="createForm.br_code"
          label="Branch"
          required
          :options="branchOptions"
        />
        <BaseInput
          v-model="createForm.user_name"
          label="Username"
          required
        />
        <BaseInput
          v-model="createForm.member_code"
          label="Member code"
          required
        />
        <BaseInput
          v-model="createForm.email"
          type="email"
          label="Email"
          required
        />
        <BaseSelect
          v-model="createForm.user_role"
          label="Role"
          required
          :options="roleOptions"
        />
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            v-model="createForm.sendReset"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          >
          Send setup/reset code by email
        </label>
        <div class="flex justify-end">
          <BaseButton
            :icon="CheckIcon"
            :loading="saving"
            @click="submitCreate"
          >
            Save
          </BaseButton>
        </div>
      </div>
    </BaseModal>

    <BaseModal
      :open="editOpen"
      title="Edit branch user"
      @close="editOpen = false"
    >
      <div class="space-y-3">
        <BaseSelect
          v-model="editForm.br_code"
          label="Branch"
          required
          :options="branchOptions"
        />
        <BaseInput
          v-model="editForm.member_code"
          label="Member code"
          required
        />
        <BaseInput
          v-model="editForm.email"
          type="email"
          label="Email"
        />
        <BaseSelect
          v-model="editForm.user_role"
          label="Role"
          required
          :options="roleOptions"
        />
        <BaseSelect
          v-model="editForm.user_stat"
          label="Status"
          :options="[
            { value: 0, label: 'Active' },
            { value: 1, label: 'Inactive' },
          ]"
        />
        <div class="flex justify-end">
          <BaseButton
            :icon="CheckIcon"
            :loading="saving"
            @click="submitEdit"
          >
            Update
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
