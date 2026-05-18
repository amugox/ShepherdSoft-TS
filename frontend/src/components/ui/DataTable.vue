<script setup lang="ts" generic="T extends Record<string, unknown>">
import { computed } from 'vue';

import { PAGE_SIZE_OPTIONS } from '@shepherd/shared';

import BrandLoader from '@/components/brand/BrandLoader.vue';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Custom getter when the cell isn't a top-level row key. */
  get?: (row: T) => unknown;
}

const props = withDefaults(
  defineProps<{
    rows: T[];
    columns: Column<T>[];
    loading?: boolean;
    emptyText?: string;
    /** Pass `total` (from server) to enable the pagination footer. */
    total?: number;
    page?: number;
    pageSize?: number;
    pageSizeOptions?: readonly number[];
  }>(),
  {
    loading: false,
    emptyText: undefined,
    total: undefined,
    page: 1,
    pageSize: 25,
    pageSizeOptions: () => PAGE_SIZE_OPTIONS,
  },
);

const emit = defineEmits<{
  (e: 'rowClick', row: T): void;
  (e: 'update:page', value: number): void;
  (e: 'update:pageSize', value: number): void;
}>();

const paginated = computed(() => typeof props.total === 'number');
const totalCount = computed(() => props.total ?? 0);
const pageCount = computed(() =>
  totalCount.value > 0 ? Math.max(1, Math.ceil(totalCount.value / props.pageSize)) : 1,
);
// Derived from actual rows shown — never inverts, even on an out-of-range page.
const rangeFrom = computed(() =>
  props.rows.length === 0 ? 0 : (props.page - 1) * props.pageSize + 1,
);
const rangeTo = computed(() =>
  props.rows.length === 0 ? 0 : (props.page - 1) * props.pageSize + props.rows.length,
);
const canPrev = computed(() => props.page > 1);
const canNext = computed(() => props.page < pageCount.value);

const navBtnClass =
  'inline-flex h-7 items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 ' +
  'text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

const goPrev = (): void => {
  if (canPrev.value) emit('update:page', props.page - 1);
};
const goNext = (): void => {
  if (canNext.value) emit('update:page', props.page + 1);
};
const onPageSize = (e: Event): void => {
  const v = Number((e.target as HTMLSelectElement).value);
  if (Number.isFinite(v) && v > 0) emit('update:pageSize', v);
};
</script>

<template>
  <div class="card overflow-hidden">
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-slate-200 text-sm">
        <thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th
              v-for="c in columns"
              :key="String(c.key)"
              class="px-4 py-2 font-semibold"
              :class="{
                'text-left': !c.align || c.align === 'left',
                'text-center': c.align === 'center',
                'text-right': c.align === 'right',
              }"
              :style="c.width ? { width: c.width } : undefined"
            >
              {{ c.label }}
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-if="loading">
            <td
              :colspan="columns.length"
              class="px-4 py-10"
            >
              <BrandLoader
                :size="56"
                label="Loading…"
              />
            </td>
          </tr>
          <tr v-else-if="!rows.length">
            <td
              :colspan="columns.length"
              class="px-4 py-10 text-center text-slate-500"
            >
              {{ emptyText ?? 'No records.' }}
            </td>
          </tr>
          <tr
            v-else
            v-for="(row, idx) in rows"
            :key="(row as Record<string, unknown>)['code'] !== undefined
              ? String((row as Record<string, unknown>)['code'])
              : (row as Record<string, unknown>)['id'] !== undefined
                ? String((row as Record<string, unknown>)['id'])
                : idx"
            class="hover:bg-slate-50"
            @click="$emit('rowClick', row)"
          >
            <td
              v-for="c in columns"
              :key="String(c.key)"
              class="px-4 py-2 text-slate-700"
              :class="{
                'text-left': !c.align || c.align === 'left',
                'text-center': c.align === 'center',
                'text-right': c.align === 'right',
              }"
            >
              <slot
                :name="String(c.key)"
                :row="row"
                :value="c.get ? c.get(row) : row[c.key as keyof T]"
              >
                {{ c.get ? c.get(row) : row[c.key as keyof T] }}
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="paginated"
      class="flex flex-col gap-2 border-t border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-4"
    >
      <label class="flex items-center gap-2">
        <span class="text-slate-500">Rows</span>
        <select
          class="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
          :value="pageSize"
          :disabled="loading"
          @change="onPageSize"
        >
          <option
            v-for="opt in pageSizeOptions"
            :key="opt"
            :value="opt"
          >
            {{ opt }}
          </option>
        </select>
      </label>

      <p
        aria-live="polite"
        class="text-slate-500"
      >
        <template v-if="totalCount === 0">
          No results
        </template>
        <template v-else>
          Showing <span class="font-medium text-slate-700">{{ rangeFrom }}</span>–<span class="font-medium text-slate-700">{{ rangeTo }}</span> of <span class="font-medium text-slate-700">{{ totalCount }}</span>
        </template>
      </p>

      <div class="flex items-center gap-1">
        <button
          type="button"
          :class="navBtnClass"
          :disabled="!canPrev || loading"
          aria-label="Previous page"
          @click="goPrev"
        >
          ‹ Prev
        </button>
        <span class="px-2 tabular-nums text-slate-500">
          Page {{ page }} / {{ pageCount }}
        </span>
        <button
          type="button"
          :class="navBtnClass"
          :disabled="!canNext || loading"
          aria-label="Next page"
          @click="goNext"
        >
          Next ›
        </button>
      </div>
    </div>
  </div>
</template>
