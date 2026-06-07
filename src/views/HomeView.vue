<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";

import {
  referenceFromUrlInput,
  routeForReference,
  unsupportedSourceUrlMessage,
} from "@/source-services/registry";

const router = useRouter();
const sourceUrl = ref("");
const inputError = ref("");

async function openSource() {
  const reference = referenceFromUrlInput(sourceUrl.value);
  if (reference === null) {
    inputError.value = unsupportedSourceUrlMessage;
    return;
  }

  inputError.value = "";
  await router.push(routeForReference(reference));
}
</script>

<template>
  <main class="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
    <section class="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-semibold tracking-normal">Checkgist</h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">Supports GitHub Gist and Pastebin.</p>
      </div>

      <form class="space-y-3" novalidate @submit.prevent="openSource">
        <label class="sr-only" for="source-url">Source URL</label>
        <div class="flex flex-col gap-3 sm:flex-row">
          <input
            id="source-url"
            v-model="sourceUrl"
            aria-describedby="source-url-helper source-url-error"
            :aria-invalid="inputError.length > 0"
            class="min-h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            placeholder="Paste a GitHub Gist or supported source URL"
            type="text"
          />
          <button
            class="min-h-11 rounded-md bg-blue-700 px-5 font-medium text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:bg-blue-500 dark:text-zinc-950 dark:hover:bg-blue-400"
            type="submit"
          >
            Open
          </button>
        </div>
        <p id="source-url-helper" class="text-sm text-zinc-600 dark:text-zinc-400">
          Supports GitHub Gist and Pastebin.
        </p>
        <p
          v-if="inputError"
          id="source-url-error"
          class="text-sm font-medium text-red-700 dark:text-red-400"
          role="alert"
        >
          {{ inputError }}
        </p>
      </form>
    </section>
  </main>
</template>
