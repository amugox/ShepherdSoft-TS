<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import type { Member } from '@shepherd/shared';

import { memberApi } from '@/api/member';
import { useToast } from '@/composables/useToast';
import { formatDateOnly } from '@/lib/dates';

const props   = defineProps<{ code: string }>();
const toast   = useToast();
const member  = ref<Member | null>(null);
const loading = ref(false);
const codeNum = computed(() => Number(props.code));

const load = async (): Promise<void> => {
  loading.value = true;
  try { member.value = (await memberApi.get(codeNum.value)) ?? null; }
  catch (err) { toast.error(err instanceof Error ? err.message : 'Failed to load.'); }
  finally { loading.value = false; }
};
onMounted(load);
watch(() => props.code, load);
</script>

<template>
  <section class="space-y-4">
    <header>
      <h1 class="text-xl font-semibold text-slate-900">
        {{ member ? `${member.fname} ${member.onames ?? ''}`.trim() : '—' }}
      </h1>
      <p class="text-sm text-slate-500">
        Member #{{ member?.mno ?? '—' }}
      </p>
    </header>
    <div
      v-if="member"
      class="card grid gap-3 p-4 sm:grid-cols-2"
    >
      <div><span class="text-slate-500">Phone:</span> {{ member.pno ?? '—' }}</div>
      <div><span class="text-slate-500">Email:</span> {{ member.email ?? '—' }}</div>
      <div><span class="text-slate-500">Address:</span> {{ member.padd ?? '—' }}</div>
      <div><span class="text-slate-500">Group:</span> {{ member.grpn ?? '—' }}</div>
      <div><span class="text-slate-500">Branch:</span> {{ member.br_name ?? '—' }}</div>
      <div><span class="text-slate-500">Join date:</span> {{ member.jdt ? formatDateOnly(member.jdt) : '—' }}</div>
    </div>
    <p
      v-else-if="loading"
      class="text-sm text-slate-500"
    >
      Loading…
    </p>
    <p
      v-else
      class="text-sm text-slate-500"
    >
      Member not found.
    </p>
  </section>
</template>
