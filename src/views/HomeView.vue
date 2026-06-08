<script setup lang="ts">
import { nextTick, onMounted, ref, useTemplateRef } from "vue";
import { useRouter } from "vue-router";

import {
  referenceFromUrlInput,
  routeForReference,
  unsupportedSourceUrlMessage,
} from "@/source-services/registry";

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
  <main class="min-h-screen bg-white px-4 pt-14 text-zinc-950 sm:px-6 sm:pt-20">
    <section class="mx-auto w-full max-w-xl">
      <div>
        <h1 class="text-4xl font-semibold tracking-normal">Checkgist</h1>
        <p class="mt-2 text-base text-zinc-600">
          Turn Markdown task lists into interactive checklists
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
            class="min-h-11 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-base outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
            placeholder="Paste a GitHub Gist or supported URL"
            type="text"
          />
          <button
            class="min-h-11 rounded-md bg-zinc-950 px-5 font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950/20"
            type="submit"
          >
            Open
          </button>
        </div>
        <p
          v-if="inputError"
          id="source-url-error"
          class="text-sm font-medium text-red-700"
          role="alert"
        >
          {{ inputError }}
        </p>
      </form>
    </section>
  </main>
</template>
