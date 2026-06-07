<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { referenceFromRoute } from "@/source-services/registry";

const route = useRoute();

const reference = computed(() => {
  const path = route.path.split("/").filter(Boolean);
  return referenceFromRoute(path);
});
</script>

<template>
  <main
    class="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
  >
    <section class="mx-auto flex w-full max-w-xl flex-col gap-4">
      <RouterLink
        class="w-fit rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        to="/"
      >
        Home
      </RouterLink>

      <div v-if="reference" class="space-y-2">
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Source Reference
        </p>
        <p class="break-all text-lg font-medium">
          <template v-if="reference.type === 'github-gist'">
            GitHub Gist {{ reference.gistId }}
          </template>
          <template v-else> Pastebin {{ reference.pasteId }} </template>
        </p>
      </div>
    </section>
  </main>
</template>
