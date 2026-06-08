<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import {
  referenceFromUrlInput,
  routeForReference,
  unsupportedSourceUrlMessage,
} from "@/source-services/registry";

const supportedSites = [
  { name: "GitHub Gist", url: "https://gist.github.com/" },
  { name: "Pastebin", url: "https://pastebin.com/" },
].sort((left, right) => left.name.localeCompare(right.name));

const router = useRouter();
const sourceUrl = ref("");
const sourceUrlInput = useTemplateRef("sourceUrlInput");
const inputError = ref("");
const showSupportedSites = ref(false);

async function focusSourceInput() {
  await nextTick();
  sourceUrlInput.value?.focus();
}

async function openSource() {
  const reference = referenceFromUrlInput(sourceUrl.value);
  if (reference === null) {
    inputError.value = unsupportedSourceUrlMessage;
    return;
  }

  inputError.value = "";
  await router.push(routeForReference(reference));
}

onMounted(() => {
  void focusSourceInput();
});
</script>

<template>
  <main class="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
    <section class="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div class="space-y-2">
        <h1 class="text-4xl font-semibold tracking-normal">Checkgist</h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Turn Markdown task lists into interactive checklists.
        </p>
      </div>

      <form class="space-y-3" novalidate @submit.prevent="openSource">
        <label class="sr-only" for="source-url">Source URL</label>
        <div class="flex flex-col gap-3 sm:flex-row">
          <input
            id="source-url"
            ref="sourceUrlInput"
            v-model="sourceUrl"
            aria-describedby="source-url-helper source-url-error"
            :aria-invalid="inputError.length > 0"
            class="min-h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-base text-zinc-950 outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
            placeholder="Paste a GitHub Gist or supported URL"
            type="text"
          />
          <button
            class="min-h-11 rounded-md bg-blue-700 px-5 font-medium text-white transition hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:bg-blue-500 dark:text-zinc-950 dark:hover:bg-blue-400"
            type="submit"
          >
            Open
          </button>
        </div>
        <div id="source-url-helper" class="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
          <button
            :aria-expanded="showSupportedSites"
            aria-controls="supported-sites"
            class="border-b border-dashed border-zinc-500 pb-0.5 text-left transition hover:border-zinc-950 hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-600/30 dark:border-zinc-500 dark:hover:border-zinc-50 dark:hover:text-zinc-50"
            type="button"
            @click="showSupportedSites = !showSupportedSites"
          >
            Supported sites
          </button>
          <ul v-if="showSupportedSites" id="supported-sites" class="space-y-1">
            <li v-for="site in supportedSites" :key="site.url">
              <a
                class="underline underline-offset-2 transition hover:text-zinc-950 dark:hover:text-zinc-50"
                :href="site.url"
                rel="noopener noreferrer"
                target="_blank"
              >
                {{ site.name }}
              </a>
            </li>
          </ul>
        </div>
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
