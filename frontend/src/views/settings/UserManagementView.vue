<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import type { UserAdminRecord, UserRoleItem } from '@shepherd/shared';

import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { userApi } from '@/api/user';
import { useToast } from '@/composables/useToast';
import { UserPlusIcon, MagnifyingGlassIcon, PencilSquareIcon, EnvelopeIcon, NoSymbolIcon, CheckIcon } from '@heroicons/vue/24/outline';

const toast = useToast();

const loading = ref(false);
const search = ref('');
const users = ref<UserAdminRecord[]>([]);
const roles = ref<UserRoleItem[]>([]);

const createOpen = ref(false);
const editOpen = ref(false);
const saving = ref(false);

const createForm = ref({
  user_name: '',
  member_code: '',
  email: '',
  user_role: null as number | null,
  sendReset: true,
});

const editForm = ref({
  user_code: 0,
  member_code: '',
  email: '',
  user_role: null as number | null,
  user_stat: 0,
});

const roleOptions = computed(() => roles.value.map((r) => ({ value: r.code, label: r.name })));

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    users.value = await userApi.list({ searchText: search.value }) ?? [];
    roles.value = await userApi.listRoles() ?? [];
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load users.');
  } finally {
    loading.value = false;
  }
};

const openEdit = (row: UserAdminRecord): void => {
  editForm.value = {
    user_code: row.user_code,
    member_code: String(row.member_code ?? ''),
    email: row.email ?? '',
    user_role: row.user_role,
    user_stat: row.user_stat,
  };
  editOpen.value = true;
};

const submitCreate = async (): Promise<void> => {
  if (!createForm.value.user_name || !createForm.value.member_code || !createForm.value.email || createForm.value.user_role === null) {
    toast.warning('Fill all required fields.');
    return;
  }

  saving.value = true;
  try {
    await userApi.create({
      user_name: createForm.value.user_name.trim(),
      member_code: Number(createForm.value.member_code),
      email: createForm.value.email.trim(),
      user_role: createForm.value.user_role,
      sendReset: createForm.value.sendReset,
    });
    createOpen.value = false;
    createForm.value = { user_name: '', member_code: '', email: '', user_role: null, sendReset: true };
    toast.success('User created.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create user.');
  } finally {
    saving.value = false;
  }
};

const submitEdit = async (): Promise<void> => {
  if (!editForm.value.user_code || !editForm.value.member_code || editForm.value.user_role === null) {
    toast.warning('Fill all required fields.');
    return;
  }

  saving.value = true;
  try {
    await userApi.update({
      user_code: editForm.value.user_code,
      member_code: Number(editForm.value.member_code),
      email: editForm.value.email.trim(),
      user_role: editForm.value.user_role,
      user_stat: editForm.value.user_stat,
    });
    editOpen.value = false;
    toast.success('User updated.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update user.');
  } finally {
    saving.value = false;
  }
};

const deactivate = async (row: UserAdminRecord): Promise<void> => {
  try {
    await userApi.deactivate(row.user_code);
    toast.success('User deactivated.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to deactivate user.');
  }
};

const sendReset = async (row: UserAdminRecord): Promise<void> => {
  try {
    await userApi.triggerReset(row.user_code);
    toast.success('Reset code sent.');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to send reset code.');
  }
};

onMounted(load);
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          User Management
        </h1>
        <p class="text-sm text-slate-500">
          Create users, assign roles, deactivate accounts, and trigger password reset emails.
        </p>
      </div>
      <BaseButton
        :icon="UserPlusIcon"
        @click="createOpen = true"
      >
        Add user
      </BaseButton>
    </header>

    <form
      class="flex items-end gap-2"
      @submit.prevent="load"
    >
      <BaseInput
        v-model="search"
        label="Search"
        placeholder="Username, name or email"
        class="flex-1"
      />
      <BaseButton
        variant="secondary"
        type="submit"
        :icon="MagnifyingGlassIcon"
      >
        Search
      </BaseButton>
    </form>

    <DataTable
      :rows="users"
      :columns="[
        { key: 'user_name', label: 'Username' },
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'user_role', label: 'Role', width: '120px' },
        { key: 'user_stat', label: 'Status', width: '90px' },
        { key: 'actions', label: 'Actions', width: '240px' },
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
      title="Create user"
      @close="createOpen = false"
    >
      <div class="space-y-3">
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
      title="Edit user"
      @close="editOpen = false"
    >
      <div class="space-y-3">
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
