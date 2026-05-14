<script setup lang="ts">
import { RouterView } from 'vue-router';

import BaseToast from '@/components/ui/BaseToast.vue';
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-100">
    <div class="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-12">
      <div class="mb-8 flex items-center gap-3">
        <div class="grid h-12 w-12 place-items-center rounded-xl bg-brand-600 text-xl font-bold text-white shadow-md">
          S
        </div>
        <div>
          <div class="text-lg font-semibold text-slate-900">
            ShepherdSoft
          </div>
          <div class="text-xs text-slate-500">
            Church Data Management
          </div>
        </div>
      </div>
      <div class="card w-full p-6">
        <RouterView />
      </div>
      <footer class="mt-8 text-center text-xs text-slate-500">
        © {{ new Date().getFullYear() }} Bmat Solutions Ltd.
      </footer>
    </div>
    <BaseToast />
  </div>
</template>
