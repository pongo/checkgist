<script setup lang="ts">
import { ExternalLink, RotateCcw } from "@lucide/vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import BookmarkToggleButton from "@/bookmarks/BookmarkToggleButton.vue";
import ChecklistSessionView from "@/checklist-session/ChecklistSessionView.vue";
import { useChecklistSourceReferenceLifecycle } from "@/checklist-session/source-reference-lifecycle";
import { referenceFromRoute } from "@/source-services/registry";
import type { SourceReference } from "@/source-services/types";

import ChecklistSessionCopyLink from "./ChecklistSessionCopyLink.vue";

const route = useRoute();

function referenceFromRoutePath(routePath: string): SourceReference | null {
  const path = routePath.split("/").filter(Boolean);
  return referenceFromRoute(path);
}

const checklistSessionView = ref<InstanceType<typeof ChecklistSessionView> | null>(null);
const lifecycle = useChecklistSourceReferenceLifecycle();
const lifecycleState = lifecycle.state;
const session = computed(() =>
  lifecycleState.value.status === "ready" ? lifecycleState.value.session : null,
);
const isLoading = computed(() => lifecycleState.value.status === "loading");
const loadError = computed(() =>
  lifecycleState.value.status === "error" || lifecycleState.value.status === "unsupported"
    ? lifecycleState.value.message
    : "",
);

function resetCurrentChecklistSession() {
  checklistSessionView.value?.resetAllTasks();
}

watch(
  () => route.path,
  (nextPath) => void lifecycle.open(referenceFromRoutePath(nextPath)),
  {
    immediate: true,
  },
);

onBeforeUnmount(() => {
  lifecycle.dispose();
});
</script>

<template>
  <main class="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
    <header class="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div
        class="mx-auto flex min-h-20 w-full max-w-4xl items-center justify-between gap-3 px-4 py-5"
      >
        <RouterLink
          class="rounded-sm focus:ring-2 focus:ring-blue-600/30 focus:outline-none"
          to="/"
        >
          <h1 class="text-lg font-semibold tracking-normal">Checkgist</h1>
        </RouterLink>

        <div v-if="session" class="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <BookmarkToggleButton :session="session" />

          <ChecklistSessionCopyLink
            class="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none sm:h-8 sm:w-auto sm:px-3 dark:border-zinc-700 dark:hover:bg-zinc-900"
          />

          <a
            class="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none sm:h-8 sm:w-auto sm:px-3 dark:border-zinc-700 dark:hover:bg-zinc-900"
            :href="session.source.metadata.url"
            aria-label="View source"
            rel="noopener noreferrer"
            target="_blank"
            title="View source"
          >
            <ExternalLink class="size-4" aria-hidden="true" />
            <span class="hidden sm:inline">View source</span>
          </a>

          <button
            class="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none sm:h-8 sm:w-auto sm:px-3 dark:border-zinc-700 dark:hover:bg-zinc-900"
            type="button"
            aria-label="Reset all"
            title="Reset all"
            @click="resetCurrentChecklistSession"
          >
            <RotateCcw class="size-4" aria-hidden="true" />
            <span class="hidden sm:inline">Reset all</span>
          </button>
        </div>
      </div>
    </header>

    <section class="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6">
      <p v-if="isLoading" class="text-sm text-zinc-600 dark:text-zinc-400">Loading source...</p>

      <div
        v-else-if="loadError"
        class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300"
        role="alert"
      >
        {{ loadError }}
      </div>

      <template v-else-if="session">
        <p
          v-if="session.source.metadata.description"
          class="text-sm leading-6 wrap-break-word text-zinc-700 dark:text-zinc-300"
        >
          {{ session.source.metadata.description }}
        </p>

        <ChecklistSessionView ref="checklistSessionView" :session="session" />
      </template>
    </section>
  </main>
</template>
