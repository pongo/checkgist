<script setup lang="ts">
import { ComarkRenderer } from "@comark/vue";
import type { ComarkTree } from "comark";
import { onBeforeUnmount, ref, watch } from "vue";

import { parseChecklistMarkdown } from "@/checklist";

const props = defineProps<{ content: string }>();
const tree = ref<ComarkTree | null>(null);
const error = ref("");
let timeout: ReturnType<typeof setTimeout> | null = null;
let parseToken = 0;

function scheduleParse(content: string) {
  parseToken += 1;
  const token = parseToken;
  if (timeout !== null) clearTimeout(timeout);

  timeout = setTimeout(async () => {
    try {
      const nextTree = await parseChecklistMarkdown(content);
      // A slower parse of an old draft must never replace the latest preview.
      if (token !== parseToken) return;
      tree.value = nextTree;
      error.value = "";
    } catch {
      if (token !== parseToken) return;
      error.value = "Failed to preview this Markdown.";
      tree.value = null;
    }
  }, 150);
}

function preventTaskInteraction(event: Event) {
  const target = event.target;
  if (target instanceof HTMLInputElement && target.type === "checkbox") {
    event.preventDefault();
  }
}

watch(() => props.content, scheduleParse, { immediate: true });
onBeforeUnmount(() => {
  if (timeout !== null) clearTimeout(timeout);
});
</script>

<template>
  <article
    class="markdown-body checkgist-markdown h-full overflow-auto py-3 sm:px-4 sm:py-4"
    @click.capture="preventTaskInteraction"
    @change.capture="preventTaskInteraction"
  >
    <p v-if="error" class="text-sm font-medium text-red-700 dark:text-red-300" role="alert">
      {{ error }}
    </p>
    <Suspense v-else-if="tree">
      <ComarkRenderer :tree="tree" />
      <template #fallback><span class="sr-only">Loading Markdown...</span></template>
    </Suspense>
    <span v-else class="sr-only">Loading Markdown...</span>
  </article>
</template>
