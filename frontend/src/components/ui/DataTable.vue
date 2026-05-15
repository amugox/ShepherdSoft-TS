<script setup lang="ts" generic="T extends Record<string, unknown>">
import BrandLoader from '@/components/brand/BrandLoader.vue';

export interface Column<T> {
  key: keyof T | string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  /** Custom getter when the cell isn't a top-level row key. */
  get?: (row: T) => unknown;
}

defineProps<{
  rows: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyText?: string;
}>();

defineEmits<{
  (e: 'rowClick', row: T): void;
}>();
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
  </div>
</template>
