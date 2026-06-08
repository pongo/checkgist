<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import { listenToBrowserHashState } from "@/checklist-session/browser-state";
import { formatBrowserTitle } from "@/checklist-session/browser-title";
import { buildChecklistSession } from "@/checklist-session/build";
import type { ChecklistSession } from "@/checklist-session/types";
import ChecklistSessionView from "@/components/ChecklistSessionView.vue";
import {
  referenceFromRoute,
  sourceRegistry,
  unsupportedSourceUrlMessage,
} from "@/source-services/registry";
import type { SourceReference } from "@/source-services/types";
import { copyToClipboard } from "@/shared/clipboard.ts";

const route = useRoute();

function referenceFromRoutePath(routePath: string): SourceReference | null {
  const path = routePath.split("/").filter(Boolean);
  return referenceFromRoute(path);
}

const currentChecklistSessionUrl = computed(() => {
  // Touch route.fullPath so Vue recomputes this value after router-managed hash changes.
  void route.fullPath;
  return window.location.href;
});

const session = ref<ChecklistSession | null>(null);
const checklistSessionView = ref<InstanceType<typeof ChecklistSessionView> | null>(null);
const isLoading = ref(false);
const loadError = ref("");
const isCopyLinkCopied = ref(false);

let activeLoadToken = 0;
let abortController: AbortController | null = null;
let stopHashStateListener: (() => void) | null = null;
let copyLinkResetTimeout: ReturnType<typeof setTimeout> | undefined;

function resetCopyLinkFeedback() {
  clearTimeout(copyLinkResetTimeout);
  isCopyLinkCopied.value = false;
}

async function loadSource(referenceToLoad: SourceReference | null) {
  activeLoadToken += 1;
  const loadToken = activeLoadToken;
  abortController?.abort();
  abortController = null;
  session.value = null;
  loadError.value = "";
  resetCopyLinkFeedback();

  if (referenceToLoad === null) {
    document.title = "Checkgist";
    loadError.value = unsupportedSourceUrlMessage;
    return;
  }

  const service = sourceRegistry.byType.get(referenceToLoad.type);
  if (service === undefined) {
    document.title = "Checkgist";
    loadError.value = unsupportedSourceUrlMessage;
    return;
  }

  const controller = new AbortController();
  abortController = controller;
  isLoading.value = true;

  try {
    const source = await service.load(referenceToLoad, { signal: controller.signal });
    const nextSession = await buildChecklistSession(source, {
      initialStateBits: window.location.hash,
    });

    if (loadToken !== activeLoadToken) {
      return;
    }

    session.value = nextSession;
    document.title = formatBrowserTitle(source.metadata.title);
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

async function copyCurrentChecklistSessionLink() {
  await copyToClipboard(currentChecklistSessionUrl.value);

  clearTimeout(copyLinkResetTimeout);
  isCopyLinkCopied.value = true;
  copyLinkResetTimeout = setTimeout(() => {
    isCopyLinkCopied.value = false;
  }, 2000);
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
  resetCopyLinkFeedback();
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
          class="rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30"
          to="/"
        >
          <h1 class="text-lg font-semibold tracking-normal">Checkgist</h1>
        </RouterLink>

        <div v-if="session" class="flex flex-wrap items-center justify-end gap-3">
          <a
            class="min-h-10 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:hover:bg-zinc-900"
            :href="currentChecklistSessionUrl"
            @click.prevent="copyCurrentChecklistSessionLink"
          >
            {{ isCopyLinkCopied ? "Copied" : "Copy link" }}
          </a>

          <a
            class="min-h-10 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:hover:bg-zinc-900"
            :href="session.source.metadata.url"
            rel="noopener noreferrer"
            target="_blank"
          >
            View source
          </a>

          <button
            class="min-h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:hover:bg-zinc-900"
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
          class="break-words text-sm leading-6 text-zinc-700 dark:text-zinc-300"
        >
          {{ session.source.metadata.description }}
        </p>

        <ChecklistSessionView ref="checklistSessionView" :session="session" />
      </template>
    </section>
  </main>
</template>
