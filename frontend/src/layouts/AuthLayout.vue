<script setup lang="ts">
import { RouterView } from 'vue-router';

import BrandLogo from '@/components/brand/BrandLogo.vue';
import BaseToast from '@/components/ui/BaseToast.vue';
</script>

<template>
  <div class="min-h-screen bg-bg-neutral">
    <!-- Decorative brand gradient backdrop. aria-hidden — visual only. -->
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <div class="absolute -top-32 left-1/2 h-[480px] w-[480px] -translate-x-1/2 rounded-full bg-soft-teal/15 blur-3xl" />
      <div class="absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-accent-gold/10 blur-3xl" />
    </div>

    <div class="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-4 py-12">
      <header class="mb-10">
        <BrandLogo variant="hero" />
      </header>

      <div class="card w-full p-6 shadow-lg">
        <RouterView />
      </div>

      <footer class="mt-8 text-center text-xs text-slate-500">
        © {{ new Date().getFullYear() }} Bmat Solutions Ltd.
      </footer>
    </div>
    <BaseToast />
  </div>
</template>
