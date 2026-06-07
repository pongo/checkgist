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

const reference = computed(() => {
  const path = route.path.split("/").filter(Boolean);
  return referenceFromRoute(path);
});

const session = ref<ChecklistSession | null>(null);
const isLoading = ref(false);
const loadError = ref("");
const copyFeedback = ref<"idle" | "success" | "error">("idle");

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
  copyFeedback.value = "idle";

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
  copyFeedback.value = "idle";

  try {
    if (navigator.clipboard?.writeText === undefined) {
      throw new Error("Clipboard is unavailable.");
    }

    await copyToClipboard(window.location.href);
    copyFeedback.value = "success";
  } catch {
    copyFeedback.value = "error";
  }
}

watch(reference, (nextReference) => void loadSource(nextReference), { immediate: true });

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
  <main class="min-h-screen bg-zinc-50 px-4 py-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
    <section class="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <RouterLink
          class="min-h-10 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:hover:bg-zinc-900"
          to="/"
        >
          Home
        </RouterLink>

        <div v-if="session" class="flex flex-wrap items-center justify-end gap-3">
          <button
            aria-describedby="copy-link-feedback"
            class="min-h-10 rounded-md border border-zinc-300 px-3 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:hover:bg-zinc-900"
            type="button"
            @click="copyCurrentChecklistSessionLink"
          >
            Copy link
          </button>

          <a
            class="min-h-10 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-700 dark:hover:bg-zinc-900"
            :href="session.source.metadata.url"
            rel="noopener noreferrer"
            target="_blank"
          >
            View source
          </a>

          <p
            v-if="copyFeedback === 'success'"
            id="copy-link-feedback"
            class="basis-full text-right text-sm font-medium text-green-700 dark:text-green-400"
            role="status"
          >
            Link copied.
          </p>
          <p
            v-else-if="copyFeedback === 'error'"
            id="copy-link-feedback"
            class="basis-full text-right text-sm font-medium text-red-700 dark:text-red-400"
            role="alert"
          >
            Could not copy link.
          </p>
        </div>
      </header>

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

        <ChecklistSessionView :session="session" />
      </template>
    </section>
  </main>
</template>
