<script setup lang="ts">
import { Bookmark as BookmarkIcon } from "@lucide/vue";
import { computed, ref } from "vue";
import { useRoute } from "vue-router";

import type { Checklist } from "@/checklist";

import { useBookmarks } from "./useBookmarks";

const props = defineProps<{
  session: Checklist;
}>();

const route = useRoute();
const { addBookmark, bookmarks, isReady, removeBookmark } = useBookmarks();
const isBusy = ref(false);
const routePath = computed(() => route.path);
const currentBookmark = computed(() =>
  bookmarks.value.find((bookmark) => bookmark.routePath === routePath.value),
);
const isBookmarked = computed(() => currentBookmark.value !== undefined);
const buttonText = computed(() => (isBookmarked.value ? "Bookmarked" : "Bookmark"));
const defaultTitle = computed(() => {
  const title = props.session.source.metadata.title.trim();
  return title.length > 0 ? title : routePath.value;
});

async function toggleBookmark() {
  if (!isReady.value || isBusy.value) {
    return;
  }

  isBusy.value = true;

  try {
    if (isBookmarked.value) {
      await removeBookmark(routePath.value);
    } else {
      await addBookmark({
        routePath: routePath.value,
        title: defaultTitle.value,
      });
    }
  } finally {
    isBusy.value = false;
  }
}
</script>

<template>
  <button
    v-if="isReady"
    class="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md border border-zinc-300 text-sm font-medium hover:bg-zinc-100 focus:ring-2 focus:ring-blue-600/30 focus:outline-none disabled:cursor-default disabled:opacity-70 sm:h-8 sm:w-auto sm:px-3 dark:border-zinc-700 dark:hover:bg-zinc-900"
    type="button"
    :aria-label="buttonText"
    :aria-pressed="isBookmarked"
    :disabled="isBusy"
    :title="buttonText"
    @click="toggleBookmark"
  >
    <BookmarkIcon v-if="isBookmarked" class="size-4" aria-hidden="true" fill="currentColor" />
    <BookmarkIcon v-else class="size-4" aria-hidden="true" />
    <span class="hidden sm:inline">{{ buttonText }}</span>
  </button>
</template>
