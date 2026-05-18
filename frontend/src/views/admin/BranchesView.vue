<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';

import type { BranchAdminRecord } from '@shepherd/shared';

import { adminApi } from '@/api/admin';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { useToast } from '@/composables/useToast';
import { isSystemSuperAdminUser } from '@/lib/roles';
import { useAuthStore } from '@/stores/auth';
import { BuildingOfficeIcon, PlusIcon, PencilSquareIcon, NoSymbolIcon, CheckIcon } from '@heroicons/vue/24/outline';

const auth = useAuthStore();
const toast = useToast();

const isSuperAdmin = computed(() => isSystemSuperAdminUser(auth.user));
const loading = ref(false);
const saving = ref(false);
const branches = ref<BranchAdminRecord[]>([]);

const createOpen = ref(false);
const editOpen = ref(false);

const createForm = ref({ br_name: '' });
const editForm = ref({ br_code: 0, br_name: '', stat: 0 });

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    branches.value = (await adminApi.listBranches({ includeInactive: true })) ?? [];
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load branches.');
  } finally {
    loading.value = false;
  }
};

const openEdit = (row: BranchAdminRecord): void => {
  editForm.value = { br_code: row.br_code, br_name: row.br_name, stat: row.stat };
  editOpen.value = true;
};

const submitCreate = async (): Promise<void> => {
  if (!createForm.value.br_name.trim()) {
    toast.warning('Branch name is required.');
    return;
  }
  saving.value = true;
  try {
    await adminApi.createBranch({ br_name: createForm.value.br_name.trim() });
    createOpen.value = false;
    createForm.value = { br_name: '' };
    toast.success('Branch created.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to create branch.');
  } finally {
    saving.value = false;
  }
};

const submitEdit = async (): Promise<void> => {
  if (!editForm.value.br_code || !editForm.value.br_name.trim()) {
    toast.warning('Branch code and name are required.');
    return;
  }
  saving.value = true;
  try {
    await adminApi.updateBranch({
      br_code: editForm.value.br_code,
      br_name: editForm.value.br_name.trim(),
      stat: Number(editForm.value.stat),
    });
    editOpen.value = false;
    toast.success('Branch updated.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to update branch.');
  } finally {
    saving.value = false;
  }
};

const deactivate = async (row: BranchAdminRecord): Promise<void> => {
  try {
    await adminApi.deactivateBranch({ br_code: row.br_code });
    toast.success('Branch deactivated.');
    await load();
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to deactivate branch.');
  }
};

onMounted(load);
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-slate-900">
          Branch Management
        </h1>
        <p class="text-sm text-slate-500">
          Create and maintain branch records.
        </p>
      </div>
      <BaseButton
        :icon="PlusIcon"
        :disabled="!isSuperAdmin"
        @click="createOpen = true"
      >
        Add branch
      </BaseButton>
    </header>

    <DataTable
      :rows="branches"
      :columns="[
        { key: 'br_code', label: 'Code', width: '90px' },
        { key: 'br_name', label: 'Branch Name' },
        { key: 'users_count', label: 'Users', width: '100px' },
        { key: 'stat', label: 'Status', width: '110px' },
        { key: 'actions', label: 'Actions', width: '320px' },
      ]"
      :loading="loading"
      empty-text="No branches found."
    >
      <template #stat="{ row }">
        <span :class="row.stat === 0 ? 'text-emerald-700' : 'text-rose-700'">
          {{ row.stat === 0 ? 'Active' : 'Inactive' }}
        </span>
      </template>
      <template #users_count="{ row }">
        <RouterLink
          :to="{ path: '/admin/users', query: { branchCode: String(row.br_code) } }"
          class="font-medium text-brand-700 underline-offset-2 hover:underline"
          @click.stop
        >
          {{ row.users_count }}
        </RouterLink>
      </template>
      <template #actions="{ row }">
        <div class="flex gap-2">
          <RouterLink
            :to="{ path: '/admin/users', query: { branchCode: String(row.br_code) } }"
            class="btn-secondary"
            @click.stop
          >
            Users
          </RouterLink>
          <BaseButton
            variant="secondary"
            :icon="PencilSquareIcon"
            :disabled="!isSuperAdmin"
            @click.stop="openEdit(row)"
          >
            Edit
          </BaseButton>
          <BaseButton
            variant="danger"
            :icon="NoSymbolIcon"
            :disabled="!isSuperAdmin || row.stat !== 0"
            @click.stop="deactivate(row)"
          >
            Deactivate
          </BaseButton>
        </div>
      </template>
    </DataTable>

    <BaseModal
      :open="createOpen"
      title="Create branch"
      @close="createOpen = false"
    >
      <div class="space-y-3">
        <BaseInput
          v-model="createForm.br_name"
          label="Branch name"
          required
        />
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
      title="Edit branch"
      @close="editOpen = false"
    >
      <div class="space-y-3">
        <BaseInput
          v-model="editForm.br_name"
          label="Branch name"
          required
        />
        <BaseSelect
          v-model="editForm.stat"
          label="Status"
          :options="[
            { value: 0, label: 'Active' },
            { value: 1, label: 'Inactive' },
          ]"
        />
        <div class="flex justify-end">
          <BaseButton
            :icon="BuildingOfficeIcon"
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
