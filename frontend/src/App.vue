<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

// Best-effort: hydrate user from cookie on app boot. If the cookie's expired
// the very first /service call will 401 and bounce the user to /auth/login.
onMounted(() => {
  auth.hydrateFromStorage();
});
</script>

<template>
  <RouterView />
</template>
