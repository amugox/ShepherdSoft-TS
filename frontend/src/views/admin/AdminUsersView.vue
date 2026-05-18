<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import type { AdminUserRecord } from '@shepherd/shared';

import { adminApi } from '@/api/admin';
import BaseButton from '@/components/ui/BaseButton.vue';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { useToast } from '@/composables/useToast';
import { isSystemSuperAdminUser } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';
import { UserPlusIcon, MagnifyingGlassIcon, PencilSquareIcon, EnvelopeIcon, NoSymbolIcon, CheckIcon } from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const toast = useToast();

const isSuperAdmin = computed(() => isSystemSuperAdminUser(auth.user));

const loading = ref(false);
const saving = ref(false);

const admins = ref<AdminUserRecord[]>([]);
const roleOptions = [
  { value: 1, label: 'Admin' },
  { value: 0, label: 'Super Admin' },
];

const filters = ref({
  searchText: '',
  includeInactive: true,
});

const createOpen = ref(false);
const editOpen = ref(false);

const createForm = ref({
  user_name: '',
  full_names: '',
  phone_no: '',
  email: '',
  user_role: 1,
  sendReset: true,
});

const editForm = ref({
  user_code: 0,
  full_names: '',
  phone_no: '',
  email: '',
  user_role: 1,
  user_stat: 0,
});

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    admins.value = (await adminApi.listAdmins({
      searchText: filters.value.searchText.trim(),
      includeInactive: filters.value.includeInactive,
    })) ?? [];
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load admins.');
  } finally {
    loading.value = false;
  }
};

const resetCreateForm = (): void => {
  createForm.value = {
    user_name: '',
    full_names: '',
    phone_no: '',
    email: '',
    user_role: 1,
    sendReset: true,
  };
};

const openEdit = (row: AdminUserRecord): void => {
  editForm.value = {
    user_code: row.user_code,
    full_names: row.full_names,
    phone_no: row.phone_no,
    email: row.email,
    user_role: row.user_role,
    user_stat: row.user_stat,
  };
  editOpen.value = true;
};

const submitCreate = async (): Promise<void> => {
  if (!createForm.value.user_name || !createForm.value.full_names || !createForm.value.phone_no || !createForm.value.email) {
    toast.warning('Fill all required fields.');
    return;
  }
  saving.value = true;
  try {
    await adminApi.createAdmin({
      user_name: createForm.value.user_name.trim(),
      full_names: createForm.value.full_names.trim(),
      phone_no: createForm.value.phone_no.trim(),
      email: createForm.value.email.trim(),
      user_role: Number(createForm.value.user_role),
      sendReset: createForm.value.sendReset,
    });
    createOpen.value = false;
    resetCreateForm();
    toast.success('Admin created.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create admin.');
  } finally {
    saving.value = false;
  }
};

const submitEdit = async (): Promise<void> => {
  if (!editForm.value.user_code || !editForm.value.full_names || !editForm.value.phone_no || !editForm.value.email) {
    toast.warning('Fill all required fields.');
    return;
  }
  saving.value = true;
  try {
    await adminApi.updateAdmin({
      user_code: editForm.value.user_code,
      full_names: editForm.value.full_names.trim(),
      phone_no: editForm.value.phone_no.trim(),
      email: editForm.value.email.trim(),
      user_role: Number(editForm.value.user_role),
      user_stat: Number(editForm.value.user_stat),
    });
    editOpen.value = false;
    toast.success('Admin updated.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update admin.');
  } finally {
    saving.value = false;
  }
};

const deactivate = async (row: AdminUserRecord): Promise<void> => {
  try {
    await adminApi.deactivateAdmin(row.user_code);
    toast.success('Admin deactivated.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to deactivate admin.');
  }
};

const sendReset = async (row: AdminUserRecord): Promise<void> => {
  try {
    await adminApi.triggerAdminReset(row.user_code);
    toast.success('Reset code sent.');
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to send reset code.');
  }
};

onMounted(async () => {
  try {
    resetCreateForm();
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to initialize admin management.');
  }
});
</script>

<template>
  <section class="space-y-4">
    <BreadcrumbNav :items="[{ label: 'Admin', to: '/admin' }, { label: 'Admins' }]" />
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          Admin Management
        </h1>
        <p class="text-sm text-slate-500">
          Manage system administrators, roles, status, and password reset flow.
        </p>
      </div>
      <BaseButton
        :icon="UserPlusIcon"
        @click="createOpen = true"
      >
        Add admin
      </BaseButton>
    </header>

    <form
      class="grid grid-cols-1 gap-2 md:grid-cols-3"
      @submit.prevent="load"
    >
      <BaseInput
        v-model="filters.searchText"
        label="Search"
        placeholder="Username, name, phone or email"
        class="md:col-span-2"
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
      Include inactive admins
    </label>

    <DataTable
      :rows="admins"
      :columns="[
        { key: 'user_name', label: 'Username' },
        { key: 'full_names', label: 'Name' },
        { key: 'phone_no', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'role_name', label: 'Role', width: '140px' },
        { key: 'user_stat', label: 'Status', width: '100px' },
        { key: 'actions', label: 'Actions', width: '250px' },
      ]"
      :loading="loading"
      empty-text="No admins found."
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
      title="Create admin"
      @close="createOpen = false"
    >
      <div class="space-y-3">
        <BaseInput
          v-model="createForm.user_name"
          label="Username"
          required
        />
        <BaseInput
          v-model="createForm.full_names"
          label="Full names"
          required
        />
        <BaseInput
          v-model="createForm.phone_no"
          label="Phone number"
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
          :disabled="!isSuperAdmin"
          :options="isSuperAdmin ? roleOptions : roleOptions.filter((option) => option.value === 1)"
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
      title="Edit admin"
      @close="editOpen = false"
    >
      <div class="space-y-3">
        <BaseInput
          v-model="editForm.full_names"
          label="Full names"
          required
        />
        <BaseInput
          v-model="editForm.phone_no"
          label="Phone number"
          required
        />
        <BaseInput
          v-model="editForm.email"
          type="email"
          label="Email"
          required
        />
        <BaseSelect
          v-model="editForm.user_role"
          label="Role"
          :disabled="!isSuperAdmin"
          :options="isSuperAdmin ? roleOptions : roleOptions.filter((option) => option.value === 1)"
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
            Save changes
          </BaseButton>
        </div>
      </div>
    </BaseModal>
  </section>
</template>
