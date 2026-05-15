<script setup lang="ts">
import { RouterView } from 'vue-router';

import BrandLogo from '@/components/brand/BrandLogo.vue';
import BaseToast from '@/components/ui/BaseToast.vue';
</script>

<template>
  <div class="min-h-screen bg-bg-neutral lg:grid lg:grid-cols-2">
    <!-- Brand panel: side rail on lg+, compact header on smaller screens -->
    <aside
      class="relative isolate overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-brand-500 text-white"
    >
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0"
      >
        <div class="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-soft-teal/25 blur-3xl" />
        <div class="absolute bottom-[-180px] right-[-100px] h-[480px] w-[480px] rounded-full bg-accent-gold/20 blur-3xl" />
        <div class="absolute inset-x-0 top-0 h-px bg-white/10" />
      </div>

      <!-- lg+: full-height brand story -->
      <div class="relative hidden h-full flex-col justify-between px-10 py-12 lg:flex xl:px-16 xl:py-16 2xl:px-20">
        <div class="flex items-center gap-3">
          <BrandLogo
            variant="large"
            tone="dark"
          />
        </div>

        <div class="max-w-md xl:max-w-lg">
          <h2 class="text-3xl font-light leading-tight tracking-tight text-white xl:text-4xl">
            Shepherd your<br>
            <span class="font-semibold">congregation</span> with care.
          </h2>
          <p class="mt-5 text-sm leading-relaxed text-white/75 xl:text-base">
            A calm, intentional home for the day-to-day work of the church.
          </p>

          <figure class="mt-10 border-l-2 border-soft-teal/70 pl-5">
            <blockquote class="text-base italic leading-relaxed text-white/90 xl:text-lg">
              &ldquo;Be shepherds of God&rsquo;s flock that is under your care, watching over them.&rdquo;
            </blockquote>
            <figcaption class="mt-3 text-xs font-medium uppercase tracking-widest text-white/55">
              1 Peter 5:2 &middot; NIV
            </figcaption>
          </figure>
        </div>

        <p class="text-xs text-white/60">
          © {{ new Date().getFullYear() }} Bmat Solutions Ltd.
        </p>
      </div>

      <!-- below lg: condensed branded header bar -->
      <div class="relative flex items-center justify-center px-4 py-6 sm:px-6 sm:py-8 lg:hidden">
        <BrandLogo
          variant="horizontal"
          tone="dark"
        />
      </div>
    </aside>

    <!-- Form panel -->
    <main class="relative flex min-h-[55vh] items-center justify-center px-4 py-10 sm:px-6 sm:py-12 lg:min-h-screen lg:px-8 lg:py-16">
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 overflow-hidden lg:hidden"
      >
        <div class="absolute -bottom-24 right-[-80px] h-72 w-72 rounded-full bg-accent-gold/10 blur-3xl" />
      </div>

      <div class="relative w-full max-w-md">
        <div class="card border-slate-200/80 bg-white/95 p-5 shadow-xl ring-1 ring-slate-900/5 backdrop-blur-sm sm:p-7 lg:p-8">
          <RouterView />
        </div>
        <p class="mt-6 text-center text-xs text-slate-500 lg:hidden">
          © {{ new Date().getFullYear() }} Bmat Solutions Ltd.
        </p>
      </div>
    </main>

    <BaseToast />
  </div>
</template>
