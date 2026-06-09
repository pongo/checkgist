<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { listenToBrowserHashState } from "@/checklist-session/browser-state";
import { loadChecklistSession } from "@/checklist-session/load";
import type { ChecklistSession } from "@/checklist-session/types";
import ChecklistSessionCopyLink from "@/components/ChecklistSessionCopyLink.vue";
import ChecklistSessionView from "@/components/ChecklistSessionView.vue";
import { referenceFromRoute } from "@/source-services/registry";
import type { SourceReference } from "@/source-services/types";

const route = useRoute();

function referenceFromRoutePath(routePath: string): SourceReference | null {
  const path = routePath.split("/").filter(Boolean);
  return referenceFromRoute(path);
}

const session = ref<ChecklistSession | null>(null);
const checklistSessionView = ref<InstanceType<typeof ChecklistSessionView> | null>(null);
const isLoading = ref(false);
const loadError = ref("");

let activeLoadToken = 0;
let abortController: AbortController | null = null;
let stopHashStateListener: (() => void) | null = null;

async function loadSource(referenceToLoad: SourceReference | null) {
  activeLoadToken += 1;
  const loadToken = activeLoadToken;
  abortController?.abort();
  abortController = null;
  session.value = null;
  loadError.value = "";

  const controller = new AbortController();
  abortController = controller;
  isLoading.value = true;

  try {
    const result = await loadChecklistSession(referenceToLoad, {
      stateBits: window.location.hash,
      signal: controller.signal,
    });

    if (loadToken !== activeLoadToken) {
      return;
    }

    if (result.status === "unsupported") {
      document.title = "Checkgist";
      loadError.value = result.message;
      return;
    }

    session.value = result.session;
    document.title = result.browserTitle;
  } catch (error) {
    if (loadToken !== activeLoadToken) {
      return;
    }

    document.title = "Checkgist";
    loadError.value = error instanceof Error ? error.message : "Failed to load source.";
  } finally {
    if (loadToken === activeLoadToken) {
      isLoading.value = false;
    }
  }
}

function resetCurrentChecklistSession() {
  checklistSessionView.value?.resetAllTasks();
}

watch(
  () => route.path,
  (nextPath) => void loadSource(referenceFromRoutePath(nextPath)),
  {
    immediate: true,
  },
);

onMounted(() => {
  stopHashStateListener = listenToBrowserHashState(() => session.value);
});

onBeforeUnmount(() => {
  activeLoadToken += 1;
  abortController?.abort();
  stopHashStateListener?.();
});
</script>

<template>
  <main class="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
    <header class="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div
        class="mx-auto flex min-h-20 w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-5"
      >
        <RouterLink
          class="rounded-sm focus:ring-2 focus:ring-blue-600/30 focus:outline-none"
          to="/"
        >
          <h1 class="text-lg font-semibold tracking-normal">Checkgist</h1>
        </RouterLink>

        <div v-if="session" class="flex flex-wrap items-center justify-end gap-3">
          <ChecklistSessionCopyLink
            class="min-h-8 content-center rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-zinc-700 dark:hover:bg-zinc-900"
          />

          <a
            class="min-h-8 content-center rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-zinc-700 dark:hover:bg-zinc-900"
            :href="session.source.metadata.url"
            rel="noopener noreferrer"
            target="_blank"
          >
            View source
          </a>

          <button
            class="min-h-8 content-center rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none dark:border-zinc-700 dark:hover:bg-zinc-900"
            type="button"
            @click="resetCurrentChecklistSession"
          >
            Reset all
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
