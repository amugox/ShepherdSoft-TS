import { ref, type Ref } from 'vue';

import { PAGE_SIZE_DEFAULT } from '@shepherd/shared';

export interface UsePaginationReturn {
  page: Ref<number>;
  pageSize: Ref<number>;
  total: Ref<number>;
  reset: () => void;
}

/**
 * Small reactive bundle for paginated lists. One instance per list (a store
 * with both members and families uses two instances). `reset()` returns to
 * page 1 — call it whenever the filter changes.
 */
export function usePagination(initialSize: number = PAGE_SIZE_DEFAULT): UsePaginationReturn {
  const page = ref(1);
  const pageSize = ref(initialSize);
  const total = ref(0);

  const reset = (): void => {
    page.value = 1;
  };

  return { page, pageSize, total, reset };
}
