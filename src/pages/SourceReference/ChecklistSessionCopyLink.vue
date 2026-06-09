<script setup lang="ts">
import { Check, Copy } from "@lucide/vue";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";

import { copyToClipboard } from "@/shared/clipboard.ts";

const route = useRoute();

const currentChecklistSessionUrl = computed(() => {
  // Touch route.fullPath so Vue recomputes this value after router-managed hash changes.
  void route.fullPath;
  return window.location.href;
});

const isCopied = ref(false);

let resetTimeout: ReturnType<typeof setTimeout> | undefined;

function resetCopyLinkFeedback() {
  clearTimeout(resetTimeout);
  isCopied.value = false;
}

async function copyCurrentChecklistSessionLink() {
  await copyToClipboard(currentChecklistSessionUrl.value);

  clearTimeout(resetTimeout);
  isCopied.value = true;
  resetTimeout = setTimeout(() => {
    isCopied.value = false;
  }, 2000);
}

watch(() => route.fullPath, resetCopyLinkFeedback);

onBeforeUnmount(resetCopyLinkFeedback);
</script>

<template>
  <a
    :href="currentChecklistSessionUrl"
    aria-label="Copy link"
    title="Copy link"
    @click.prevent="copyCurrentChecklistSessionLink"
  >
    <Check v-if="isCopied" class="size-4" aria-hidden="true" />
    <Copy v-else class="size-4" aria-hidden="true" />
    <span class="hidden sm:inline">{{ isCopied ? "Copied" : "Copy link" }}</span>
  </a>
</template>
