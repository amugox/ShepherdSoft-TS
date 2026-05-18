<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { ListItemType, type ListItem, type MessagingRecipient } from '@shepherd/shared';

import { dataApi } from '@/api/data';
import { messagingApi } from '@/api/messaging';
import BaseButton from '@/components/ui/BaseButton.vue';
import BreadcrumbNav from '@/components/ui/BreadcrumbNav.vue';
import BaseTextarea from '@/components/ui/BaseTextarea.vue';
import DataTable from '@/components/ui/DataTable.vue';
import { useToast } from '@/composables/useToast';
import { EyeIcon, PaperAirplaneIcon } from '@heroicons/vue/24/outline';

const toast = useToast();
const loading = ref(false);
const sending = ref(false);

const message = ref('');
const manualNumbers = ref('');
const fellowships = ref<ListItem[]>([]);
const selectedFellowships = ref<number[]>([]);

const previewRows = ref<MessagingRecipient[]>([]);
const lastTotal = ref(0);

const parseManualNumbers = (): string[] =>
  manualNumbers.value
    .split(/[\n,;]/)
    .map((x) => x.trim())
    .filter((x) => x.length > 0);

const payload = computed(() => ({
  msg: message.value.trim(),
  pnos: parseManualNumbers(),
  flsps: selectedFellowships.value,
}));

const loadFellowships = async (): Promise<void> => {
  loading.value = true;
  try {
    fellowships.value = (await dataApi.getList(ListItemType.MemberGroup)) ?? [];
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to load fellowships.');
  } finally {
    loading.value = false;
  }
};

const preview = async (): Promise<void> => {
  loading.value = true;
  try {
    const res = await messagingApi.preview(payload.value);
    previewRows.value = res?.recipients ?? [];
    lastTotal.value = res?.total ?? 0;
    if (!lastTotal.value) {
      toast.warning('No recipients found.');
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to preview recipients.');
  } finally {
    loading.value = false;
  }
};

const sendSms = async (): Promise<void> => {
  sending.value = true;
  try {
    const res = await messagingApi.send(payload.value);
    previewRows.value = res?.recipients ?? [];
    lastTotal.value = res?.total ?? 0;
    toast.success(
      `SMS batch prepared for ${lastTotal.value} recipient${lastTotal.value === 1 ? '' : 's'}.`,
    );
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Failed to prepare SMS batch.');
  } finally {
    sending.value = false;
  }
};

onMounted(() => {
  void loadFellowships();
});

const columns = [
  { key: 'pno', label: 'Phone' },
  { key: 'source', label: 'Source', width: '130px' },
  { key: 'mname', label: 'Recipient' },
  { key: 'fname', label: 'Fellowship' },
];
</script>

<template>
  <section class="space-y-4">
    <BreadcrumbNav :items="[{ label: 'Home', to: '/' }, { label: 'Messaging' }]" />
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        Messaging
      </h1>
      <p class="text-sm text-slate-500">
        Prepare SMS batches to direct numbers and fellowships. Gateway delivery integration is external.
      </p>
    </header>

    <div class="card space-y-4 p-4">
      <BaseTextarea
        v-model="message"
        label="SMS message"
        placeholder="Type message text..."
        :rows="4"
        :maxlength="480"
      />

      <BaseTextarea
        v-model="manualNumbers"
        label="Direct phone numbers"
        placeholder="One number per line or comma-separated"
        :rows="3"
      />

      <div class="space-y-2">
        <p class="label-sm">
          Fellowships / member groups
        </p>
        <div
          v-if="loading && !fellowships.length"
          class="text-sm text-slate-500"
        >
          Loading fellowships...
        </div>
        <div
          v-else
          class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          <label
            v-for="f in fellowships"
            :key="f.itemvalue"
            class="flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          >
            <input
              v-model="selectedFellowships"
              type="checkbox"
              :value="f.itemvalue"
            >
            <span>{{ f.itemname }}</span>
          </label>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <BaseButton
          variant="secondary"
          :icon="EyeIcon"
          :loading="loading"
          @click="preview"
        >
          Preview recipients
        </BaseButton>
        <BaseButton
          :icon="PaperAirplaneIcon"
          :loading="sending"
          @click="sendSms"
        >
          Prepare SMS batch
        </BaseButton>
      </div>
    </div>

    <DataTable
      :rows="previewRows"
      :columns="columns"
      :loading="loading"
      :empty-text="'No recipients yet.'"
    />
    <p class="text-sm text-slate-500">
      Total recipients: {{ lastTotal }}
    </p>
  </section>
</template>
