<script setup lang="ts">
import { FilePlus2 } from "@lucide/vue";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { localDocumentEditRoute, localDocumentViewRoute } from "./source-service";
import { useLocalDocuments } from "./useLocalDocuments";

const router = useRouter();
const { documents, status, error, ensureLoaded, createDocument } = useLocalDocuments();
const isCreating = ref(false);
const createError = ref("");

async function createAndOpenDocument() {
  if (isCreating.value) return;

  isCreating.value = true;
  createError.value = "";
  try {
    const document = await createDocument();
    await router.push(localDocumentEditRoute(document.id));
  } catch (error) {
    createError.value = error instanceof Error ? error.message : "Failed to create Local Document.";
  } finally {
    isCreating.value = false;
  }
}

onMounted(() => {
  void ensureLoaded();
});
</script>

<template>
  <section class="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Local documents</h2>
      <button
        class="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-zinc-300 px-2.5 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none disabled:cursor-wait disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
        type="button"
        :disabled="isCreating"
        @click="createAndOpenDocument"
      >
        <FilePlus2 class="size-4" aria-hidden="true" />
        New document
      </button>
    </div>

    <p v-if="status === 'loading'" class="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
      Loading Local Documents...
    </p>
    <p
      v-else-if="status === 'ready' && documents.length === 0"
      class="mt-3 text-sm text-zinc-600 dark:text-zinc-400"
    >
      No local documents yet
    </p>
    <ul v-else-if="status === 'ready'" class="mt-3 space-y-1">
      <li v-for="document in documents" :key="document.id" class="flex h-6 items-center gap-3">
        <span
          class="size-1.5 shrink-0 rounded-full bg-zinc-950 dark:bg-zinc-50"
          aria-hidden="true"
        />
        <RouterLink
          class="min-w-0 flex-1 truncate rounded-sm text-base text-zinc-800 hover:text-[#0969da] focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:text-zinc-200 dark:hover:text-[#4493f8]"
          :to="localDocumentViewRoute(document.id)"
        >
          {{ document.title }}
        </RouterLink>
      </li>
    </ul>
    <p
      v-if="error || createError"
      class="mt-3 text-sm font-medium text-red-700 dark:text-red-300"
      role="alert"
    >
      {{ createError || "Failed to load Local Documents." }}
    </p>
  </section>
</template>
