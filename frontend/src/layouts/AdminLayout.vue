<script setup lang="ts">
import { RouterView } from 'vue-router';

import AdminSidebar from '@/components/layout/AdminSidebar.vue';
import AppTopbar from '@/components/layout/AppTopbar.vue';
import BaseToast from '@/components/ui/BaseToast.vue';
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden">
    <AdminSidebar />
    <div class="flex min-w-0 flex-1 flex-col">
      <AppTopbar />
      <main class="flex-1 overflow-y-auto bg-bg-neutral">
        <div class="mx-auto w-full max-w-7xl p-6">
          <RouterView />
        </div>
      </main>
    </div>
    <BaseToast />
  </div>
</template>
