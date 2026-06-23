<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import { BookmarkList } from "@/bookmarks";
import HomePageGitHubCorner from "./HomePageGitHubCorner.vue";
import {
  referenceFromUrlInput,
  routeForReference,
  unsupportedSourceUrlMessage,
} from "@/source-services";

const router = useRouter();
const sourceUrl = ref("");
const sourceUrlInput = useTemplateRef("sourceUrlInput");
const inputError = ref("");

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
  <main
    class="min-h-screen bg-white px-4 pt-14 text-zinc-950 sm:px-6 sm:pt-20 dark:bg-zinc-950 dark:text-zinc-50"
  >
    <HomePageGitHubCorner />

    <section class="mx-auto w-full max-w-xl">
      <div>
        <h1 class="text-4xl font-semibold tracking-normal">Checkgist</h1>
        <p class="mt-2 text-base text-zinc-600 dark:text-zinc-400">
          Turn Markdown task lists into interactive checklists.
          <RouterLink
            to="/gist.github.com/6850950b2f317048e6c59fe2878c1fda"
            class="border-b-2 border-[#0969da] hover:text-[#0969da] dark:border-[#4493f8] dark:hover:text-[#4493f8]"
            >Example</RouterLink
          >
        </p>
      </div>

      <form class="mt-8 space-y-3" novalidate @submit.prevent="openSource">
        <label class="sr-only" for="source-url">Source URL</label>
        <div class="flex flex-col gap-3 sm:flex-row">
          <input
            id="source-url"
            ref="sourceUrlInput"
            v-model="sourceUrl"
            aria-describedby="source-url-error"
            :aria-invalid="inputError.length > 0"
            class="min-h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-base transition outline-none focus:ring-2 focus:ring-zinc-950/10 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-blue-600/30"
            placeholder="Paste a GitHub Gist or supported URL"
            type="text"
            autocomplete="off"
          />
          <button
            class="min-h-11 rounded-md border border-zinc-300 px-5 text-base font-medium transition hover:bg-zinc-100 focus:ring-2 focus:ring-zinc-950/20 focus:outline-none dark:border dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800 dark:focus:ring-blue-600/30"
            type="submit"
          >
            Open
          </button>
        </div>
        <p
          v-if="inputError"
          id="source-url-error"
          class="text-sm font-medium text-red-700 dark:text-red-300"
          role="alert"
        >
          {{ inputError }}.
          <a
            href="https://github.com/pongo/checkgist"
            class="border-b border-red-700 hover:text-red-800 dark:border-red-300 dark:hover:text-red-200"
            rel="noopener noreferrer"
            target="_blank"
            >See supported sites</a
          >
        </p>
      </form>

      <BookmarkList />
    </section>
  </main>
</template>
